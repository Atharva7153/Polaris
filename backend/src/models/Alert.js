const mongoose = require('mongoose');
const AlertSchema = new mongoose.Schema({
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    assetName: String,
    type: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    riskLevel: String,
    anomalyScore: Number,
    failureProbability: Number,
    decisionPriority: String,
    message: String,
    explanation: String,
    affectedAssets: [String],
    status: { type: String, enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'], default: 'ACTIVE' },
    metadata: Object,
    acknowledgedAt: Date,
    resolvedAt: Date,
    timestamp: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Alert', AlertSchema);
