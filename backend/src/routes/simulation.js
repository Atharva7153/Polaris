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
        
        // Phase 8: Calculate station-level resilience and energy impact of the scenario
        const baseResilience = 82;
        const riskDelta = Math.max(0, simulationResult.change?.riskIncrease || 0);
        const cascadeCount = simulationResult.cascade?.cascadeRisks?.length || 0;
        
        // Explainable resilience impact
        const resilienceDrop = Math.min(65, Math.round(riskDelta * 40 + cascadeCount * 6 + ((changes.generatorLoad && changes.generatorLoad > 80) ? 10 : 0)));
        const simulatedResilience = Math.max(18, baseResilience - resilienceDrop);

        // Energy margin impact
        const baseMargin = 78;
        const loadExcess = changes.generatorLoad ? Math.max(0, changes.generatorLoad - 68) : 0;
        const marginDrop = Math.min(70, Math.round(loadExcess * 1.6 + riskDelta * 35));
        const simulatedMargin = Math.max(8, baseMargin - marginDrop);

        // Fuel consumption impact
        const fuelDeltaPercent = changes.generatorLoad ? Math.round(((changes.generatorLoad - 68) / 68) * 100) : 0;

        simulationResult.stationImpact = {
            baselineResilience: baseResilience,
            simulatedResilience: simulatedResilience,
            resilienceDrop: resilienceDrop,
            baselineEnergyMargin: baseMargin,
            simulatedEnergyMargin: simulatedMargin,
            fuelConsumptionDeltaPercent: fuelDeltaPercent > 0 ? `+${fuelDeltaPercent}%` : `${fuelDeltaPercent}%`
        };

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

        // Build anomalous telemetry
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
        
        // Guarantee CRITICAL alert generation for live trigger test
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
