const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Asset = require('./src/models/Asset');
const Telemetry = require('./src/models/Telemetry');
const Alert = require('./src/models/Alert');

dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/polaris';

const newAssets = [
  { assetId: 'FUEL-01', name: 'Primary Fuel Reservoir', type: 'Fuel System', status: 'NORMAL', criticality: 'CRITICAL', metadata: { capacity: '50000L' } },
  { assetId: 'DG-001', name: 'Primary Diesel Generator', type: 'Generator', status: 'NORMAL', criticality: 'CRITICAL', metadata: { model: 'CAT-C32', capacity: '1000kW' } },
  { assetId: 'DG-002', name: 'Secondary Diesel Generator', type: 'Generator', status: 'NORMAL', criticality: 'HIGH', metadata: { model: 'CAT-C18', capacity: '600kW' } },
  { assetId: 'BAT-01', name: 'Alpha Battery Bank', type: 'Battery System', status: 'NORMAL', criticality: 'HIGH', metadata: { capacity: '500kWh' } },
  { assetId: 'BAT-02', name: 'Beta Battery Bank', type: 'Battery System', status: 'NORMAL', criticality: 'MEDIUM', metadata: { capacity: '250kWh' } },
  { assetId: 'HVAC-01', name: 'Lab Cooling Unit', type: 'HVAC', status: 'NORMAL', criticality: 'HIGH', metadata: { zone: 'Laboratory' } },
  { assetId: 'HVAC-02', name: 'Server Room Chiller', type: 'HVAC', status: 'NORMAL', criticality: 'CRITICAL', metadata: { zone: 'Data Center' } },
  { assetId: 'HVAC-03', name: 'Crew Quarters HVAC', type: 'HVAC', status: 'NORMAL', criticality: 'MEDIUM', metadata: { zone: 'Living Area' } },
  { assetId: 'PUMP-01', name: 'Main Coolant Pump', type: 'Pump', status: 'NORMAL', criticality: 'HIGH', metadata: { flowRate: '150L/m' } },
  { assetId: 'PUMP-02', name: 'Secondary Coolant Pump', type: 'Pump', status: 'NORMAL', criticality: 'MEDIUM', metadata: { flowRate: '100L/m' } },
  { assetId: 'COM-01', name: 'Satellite Uplink', type: 'Communications', status: 'NORMAL', criticality: 'CRITICAL', metadata: { band: 'Ku-Band' } },
];

async function seed() {
  try {
    await mongoose.connect(DB_URI);
    console.log('Connected to MongoDB');

    // Get the first station (assume one exists)
    const Station = require('./src/models/Station');
    const station = await Station.findOne();
    if (!station) throw new Error('No station found in DB. Run Phase 2 setup first.');

    console.log('Clearing old assets, telemetry, and alerts...');
    await Asset.deleteMany({});
    await Telemetry.deleteMany({});
    await Alert.deleteMany({});

    console.log('Inserting Medium Facility Assets...');
    const insertedAssets = [];
    for (const a of newAssets) {
      const doc = await Asset.create({ ...a, stationId: station._id });
      insertedAssets.push(doc);
    }
    console.log(`Inserted ${insertedAssets.length} assets.`);

    console.log('Generating Baseline Telemetry...');
    for (const asset of insertedAssets) {
      // Create 24 hours of baseline
      const telemetryDocs = [];
      const now = Date.now();
      for (let i = 24; i >= 0; i--) {
        telemetryDocs.push({
          assetId: asset._id,
          timestamp: new Date(now - i * 3600000),
          temperature: 65 + Math.random() * 15, // 65-80
          vibration: 0.1 + Math.random() * 0.1, // 0.1-0.2
          powerOutput: asset.type === 'Generator' ? 350 + Math.random() * 100 : 0,
          generatorLoad: asset.type === 'Generator' ? 50 + Math.random() * 20 : 0,
          batteryVoltage: asset.type === 'Battery System' ? 24 + Math.random() : 0,
          fuelLevel: asset.type === 'Fuel System' ? 80 - (24 - i)*0.1 : 0
        });
      }
      await Telemetry.insertMany(telemetryDocs);
    }
    console.log('Baseline telemetry generated.');

    console.log('Seed Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
