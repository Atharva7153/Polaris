const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');
const intelligenceService = require('../services/intelligenceService');

router.post('/', async (req, res) => {
    try {
        const { assetId, changes } = req.body;
        
        if (!assetId || !changes) {
            return res.status(400).json({ success: false, message: 'assetId and changes are required.' });
        }

        const Asset = require('../models/Asset');
        const asset = await Asset.findOne({ assetId });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        const latestTelemetry = await Telemetry.findOne({ assetId: asset._id }).sort({ timestamp: -1 });
        
        if (!latestTelemetry) {
            return res.status(404).json({ success: false, message: 'No baseline telemetry found for asset.' });
        }

        const simulationResult = await intelligenceService.runSimulation(assetId, latestTelemetry.toJSON(), changes);
        
        res.json({ success: true, data: simulationResult });
    } catch (err) {
        console.error("Simulation error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

const alertCreationService = require('../services/alertCreationService');

router.post('/trigger-anomaly', async (req, res) => {
    try {
        const { assetId, telemetryOverrides } = req.body;
        if (!assetId) return res.status(400).json({ success: false, message: 'assetId is required.' });

        const Asset = require('../models/Asset');
        const asset = await Asset.findOne({ assetId });
        if (!asset) return res.status(404).json({ success: false, message: 'Asset not found.' });

        // Build extremely anomalous telemetry
        const badTelemetry = await Telemetry.create({
            assetId: asset._id,
            timestamp: new Date(),
            temperature: telemetryOverrides?.temperature || 185.5,
            vibration: telemetryOverrides?.vibration || 3.85,
            powerOutput: telemetryOverrides?.powerOutput || 45,
            generatorLoad: telemetryOverrides?.generatorLoad || 110,
            batteryVoltage: telemetryOverrides?.batteryVoltage || 18.5,
            fuelLevel: telemetryOverrides?.fuelLevel || 5.0
        });

        // Wait a moment
        await new Promise(r => setTimeout(r, 500));

        const intelligence = await intelligenceService.getUnifiedIntelligence(assetId, badTelemetry.toJSON());
        
        // OVERRIDE for the trigger to guarantee a CRITICAL alert is generated
        if (intelligence.risk) {
            intelligence.risk.level = 'CRITICAL';
            intelligence.risk.score = 0.99;
        }
        if (intelligence.decision) {
            intelligence.decision.priority = 'URGENT';
            intelligence.decision.action = 'IMMEDIATE SHUTDOWN REQUIRED';
        }

        // Pass the REAL socket.io instance
        const io = req.app.get('io');
        await alertCreationService.evaluateAndCreateAlert(io, asset, intelligence);

        res.json({
            success: true,
            intelligence: intelligence,
            message: "Anomaly injected and alerts broadcasted."
        });
    } catch (err) {
        console.error("Trigger error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
