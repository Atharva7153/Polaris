const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');

router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.stationId && req.query.stationId !== 'All') filter.stationId = req.query.stationId;
        if (req.query.status && req.query.status !== 'All') filter.status = req.query.status;
        if (req.query.severity && req.query.severity !== 'All') filter.severity = req.query.severity;
        
        const alerts = await Alert.find(filter)
            .populate('assetId', 'name assetId type')
            .populate('stationId', 'name')
            .sort({ timestamp: -1 });
        res.json({ success: true, data: alerts });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id)
            .populate('assetId', 'name assetId type')
            .populate('stationId', 'name');
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        res.json({ success: true, data: alert });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/:id/acknowledge', async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(req.params.id, { 
            status: 'ACKNOWLEDGED',
            acknowledgedAt: new Date()
        }, { new: true });
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        
        req.app.get('io').emit('alert:updated', alert);
        res.json({ success: true, data: alert });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/:id/resolve', async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(req.params.id, { 
            status: 'RESOLVED',
            resolvedAt: new Date()
        }, { new: true });
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        
        req.app.get('io').emit('alert:updated', alert);
        res.json({ success: true, data: alert });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/:id/explain', async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id).populate('assetId');
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        
        const axios = require('axios');
        const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        
        // Fetch latest telemetry for this asset to send for AI analysis
        const Telemetry = require('../models/Telemetry');
        const latestTelemetry = await Telemetry.findOne({ assetId: alert.assetId._id }).sort({ timestamp: -1 });
        
        if (!latestTelemetry) {
            return res.status(400).json({ success: false, message: 'No telemetry available for analysis.' });
        }

        const payload = {
            assetId: alert.assetId.assetId,
            telemetry: {
                temperature: latestTelemetry.temperature || 0,
                vibration: latestTelemetry.vibration || 0,
                powerOutput: latestTelemetry.powerOutput || 0,
                generatorLoad: latestTelemetry.generatorLoad || 0,
                fuelLevel: latestTelemetry.fuelLevel || 0,
                coolantTemperature: latestTelemetry.coolantTemperature || 0,
                batteryVoltage: latestTelemetry.batteryVoltage || 0
            },
            anomaly: { score: alert.anomalyScore, detected: alert.anomalyScore > 0.5 },
            failurePrediction: { probability: alert.failureProbability },
            risk: { level: alert.riskLevel, score: alert.failureProbability }, // approx
            cascade: { affectedAssets: alert.affectedAssets },
            decision: { priority: alert.decisionPriority, action: alert.message }
        };

        const response = await axios.post(`${ML_SERVICE_URL}/ai-analysis`, payload, { timeout: 15000 });
        
        // Save explanation back to alert
        alert.explanation = response.data.analysis;
        await alert.save();
        
        req.app.get('io').emit('alert:updated', alert);
        res.json({ success: true, data: response.data });
    } catch (err) {
        console.error("AI Explanation Error:", err.message);
        res.status(500).json({ success: false, message: 'AI explanation temporarily unavailable.' });
    }
});

module.exports = router;
