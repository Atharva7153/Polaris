const mongoose = require('mongoose');
const AssetSchema = new mongoose.Schema({
    stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },
    name: String,
    assetId: String,
    type: String,
    status: { type: String, enum: ['NORMAL', 'WARNING', 'CRITICAL', 'OFFLINE'], default: 'NORMAL' },
    criticality: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    specifications: Object
}, { timestamps: true });
module.exports = mongoose.model('Asset', AssetSchema);
