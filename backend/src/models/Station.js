const mongoose = require('mongoose');
const StationSchema = new mongoose.Schema({
    name: String,
    code: String,
    location: String,
    coordinates: { latitude: Number, longitude: Number },
    status: { type: String, enum: ['OPERATIONAL', 'MAINTENANCE', 'OFFLINE'], default: 'OPERATIONAL' },
    environment: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('Station', StationSchema);
