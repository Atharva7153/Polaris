const express = require('express');
const router = express.Router();
const Station = require('../models/Station');
const Asset = require('../models/Asset');
const Telemetry = require('../models/Telemetry');
const intelligenceService = require('../services/intelligenceService');

router.get('/', async (req, res) => {
    try {
        const stations = await Station.find();
        res.json({ success: true, data: stations });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const station = await Station.findById(req.params.id);
        if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
        res.json({ success: true, data: station });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/:stationId/assets', async (req, res) => {
    try {
        const assets = await Asset.find({ stationId: req.params.stationId });
        res.json({ success: true, data: assets });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Phase 6: Station-level intelligence
router.get('/:stationId/intelligence', async (req, res) => {
    try {
        const station = await Station.findById(req.params.stationId);
        if (!station) return res.status(404).json({ success: false, message: 'Station not found' });

        const assets = await Asset.find({ stationId: station._id });
        
        let highestRiskAsset = null;
        let highestRiskScore = -1;
        let stationIntelligence = [];

        for (const asset of assets) {
            const latestTelemetry = await Telemetry.findOne({ assetId: asset._id }).sort({ timestamp: -1 });
            if (latestTelemetry) {
                const intelligence = await intelligenceService.getUnifiedIntelligence(asset.assetId, latestTelemetry);
                
                if (intelligence.status !== "UNAVAILABLE") {
                    stationIntelligence.push(intelligence);
                    
                    // Phase 7: Evaluate and create alert if necessary
                    const alertCreationService = require('../services/alertCreationService');
                    await alertCreationService.evaluateAndCreateAlert(req.app.get('io'), asset, intelligence);
                    
                    if (intelligence.risk && intelligence.risk.score > highestRiskScore) {
                        highestRiskScore = intelligence.risk.score;
                        highestRiskAsset = intelligence;
                    }
                }
            }
        }
        
        if (stationIntelligence.length === 0) {
            return res.json({ success: true, data: { status: "UNAVAILABLE", message: "No intelligence data available for station assets." }});
        }
        
        // Construct the combined station intelligence response based on the highest risk asset for the MVP
        res.json({
            success: true,
            data: {
                stationRisk: highestRiskAsset.risk,
                primaryRiskAsset: highestRiskAsset.assetId,
                cascadeImpact: highestRiskAsset.cascade ? highestRiskAsset.cascade.affectedAssets : [],
                decision: highestRiskAsset.decision,
                assetsIntelligence: stationIntelligence
            }
        });
        
    } catch (err) {
        console.error("Station intelligence error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
