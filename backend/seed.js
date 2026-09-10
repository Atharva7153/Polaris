const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
const Station = require('./src/models/Station');
const Asset = require('./src/models/Asset');
const Telemetry = require('./src/models/Telemetry');
const Alert = require('./src/models/Alert');

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@<cluster-url>/polaris?retryWrites=true&w=majority');
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await User.deleteMany();
        await Station.deleteMany();
        await Asset.deleteMany();
        await Telemetry.deleteMany();
        await Alert.deleteMany();
        console.log('Cleared existing data');
        
        // 1. Users
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);
        await User.create({
            name: 'Cmdr. Sharma',
            email: 'admin@polaris.gov',
            password: passwordHash,
            role: 'ADMIN'
        });
        
        // 2. Stations
        const s1 = await Station.create({
            name: 'Bharati',
            code: 'BHR',
            location: 'Larseman Hills, Antarctica',
            coordinates: { latitude: -69.4058, longitude: 76.1907 },
            status: 'OPERATIONAL',
            environment: 'Coastal'
        });
        
        const s2 = await Station.create({
            name: 'Maitri',
            code: 'MTR',
            location: 'Schirmacher Oasis, Antarctica',
            coordinates: { latitude: -70.7667, longitude: 11.7333 },
            status: 'OPERATIONAL',
            environment: 'Inland'
        });
        
        // 3. Assets for Bharati
        const a1 = await Asset.create({
            stationId: s1._id,
            name: 'Primary Diesel Generator',
            assetId: 'DG-001',
            type: 'Diesel Generator',
            status: 'NORMAL',
            criticality: 'CRITICAL',
            specifications: { capacity: '500kW', brand: 'Cummins' }
        });
        
        const a2 = await Asset.create({
            stationId: s1._id,
            name: 'Main HVAC Unit',
            assetId: 'HVAC-001',
            type: 'HVAC',
            status: 'WARNING',
            criticality: 'HIGH',
            specifications: { capacity: '200 tons' }
        });
        
        const a3 = await Asset.create({
            stationId: s1._id,
            name: 'Main Fuel Tank',
            assetId: 'FUEL-001',
            type: 'Fuel Storage',
            status: 'NORMAL',
            criticality: 'CRITICAL',
            specifications: { capacity: '100000L' }
        });
        
        // Assets for Maitri
        const a4 = await Asset.create({
            stationId: s2._id,
            name: 'Backup Generator',
            assetId: 'DG-002',
            type: 'Backup Generator',
            status: 'NORMAL',
            criticality: 'HIGH'
        });
        
        const a5 = await Asset.create({
            stationId: s2._id,
            name: 'Battery Bank A',
            assetId: 'BAT-001',
            type: 'Battery System',
            status: 'NORMAL',
            criticality: 'HIGH'
        });
        
        // 4. Telemetry for DG-001 (Bharati)
        const now = Date.now();
        const telemetryDocs = [];
        for (let i = 24; i >= 0; i--) {
            // Generate some somewhat realistic variance
            const isAnomaly = i === 2; // Spike 2 hours ago
            telemetryDocs.push({
                assetId: a1._id,
                timestamp: new Date(now - i * 3600000),
                temperature: isAnomaly ? 65.5 : (45 + Math.random() * 5),
                vibration: isAnomaly ? 0.45 : (0.15 + Math.random() * 0.1),
                powerOutput: 480 + Math.random() * 20,
                fuelLevel: 85 - (24 - i) * 0.5,
                generatorLoad: 80 + Math.random() * 10
            });
        }
        await Telemetry.insertMany(telemetryDocs);
        
        // 5. Alerts
        await Alert.create({
            stationId: s1._id,
            assetId: a1._id,
            type: 'VIBRATION_ANOMALY',
            severity: 'HIGH',
            message: 'DG-001 vibration spiked to 0.45 mm/s',
            status: 'ACTIVE',
            timestamp: new Date(now - 2 * 3600000)
        });
        
        await Alert.create({
            stationId: s1._id,
            assetId: a2._id,
            type: 'MAINTENANCE_REQUIRED',
            severity: 'MEDIUM',
            message: 'HVAC-001 filter replacement due',
            status: 'ACKNOWLEDGED',
            timestamp: new Date(now - 24 * 3600000)
        });
        
        console.log('Database seeded successfully');
        process.exit(0);
    } catch (err) {
        console.error('Seed error:', err);
        process.exit(1);
    }
}
seed();
