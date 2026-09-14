const express = require('express');
const router = express.Router();
const axios = require('axios');
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
        
        // Retrieve actual station baseline
        let baseResilience = 47;
        let baseMargin = 66;
        try {
            const baseUrl = `http://localhost:${process.env.PORT || 5001}`;
            const intelRes = await axios.get(`${baseUrl}/api/stations/${asset.stationId}/intelligence`);
            if (intelRes.data?.data) {
                baseResilience = intelRes.data.data.resilienceScore ?? 47;
                baseMargin = intelRes.data.data.energy?.energyMargin ?? 66;
            }
        } catch (err) {
            // fallback to station-appropriate defaults if internal fetch fails
        }

        const riskDelta = Math.max(0, simulationResult.change?.riskIncrease || 0);
        const cascadeCount = simulationResult.cascade?.cascadeRisks?.length || 0;
        
        // Explainable resilience impact
        const resilienceDrop = Math.min(baseResilience - 10, Math.round(riskDelta * 35 + cascadeCount * 4 + ((changes.generatorLoad && changes.generatorLoad > 80) ? 8 : 0)));
        const simulatedResilience = Math.max(10, baseResilience - resilienceDrop);

        // Energy margin impact
        let marginDrop = 0;
        if (changes.powerOutput !== undefined) {
            const powerDelta = Math.max(0, (latestTelemetry.powerOutput || 492) - changes.powerOutput);
            marginDrop = powerDelta;
        } else {
            const loadExcess = changes.generatorLoad ? Math.max(0, changes.generatorLoad - 68) : 0;
            marginDrop = Math.min(70, Math.round(loadExcess * 1.6 + riskDelta * 35));
        }
        const simulatedMargin = baseMargin - marginDrop;

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
