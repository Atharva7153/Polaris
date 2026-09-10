const mongoose = require('mongoose');
const TelemetrySchema = new mongoose.Schema({
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    timestamp: { type: Date, default: Date.now },
    temperature: Number,
    pressure: Number,
    humidity: Number,
    vibration: Number,
    powerOutput: Number,
    fuelLevel: Number,
    batteryVoltage: Number,
    generatorLoad: Number,
    coolantTemperature: Number
});
module.exports = mongoose.model('Telemetry', TelemetrySchema);
