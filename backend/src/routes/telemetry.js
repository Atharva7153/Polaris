const express = require('express');
const router = express.Router();
const Telemetry = require('../models/Telemetry');

router.get('/:assetId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const telemetry = await Telemetry.find({ assetId: req.params.assetId })
            .sort({ timestamp: -1 })
            .limit(limit);
        res.json({ success: true, data: telemetry.reverse() }); // Return chronologically for charts
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/:assetId/latest', async (req, res) => {
    try {
        const telemetry = await Telemetry.findOne({ assetId: req.params.assetId }).sort({ timestamp: -1 });
        if (!telemetry) return res.status(404).json({ success: false, message: 'No telemetry found' });
        res.json({ success: true, data: telemetry });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
