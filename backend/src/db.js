const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { execFileSync } = require('child_process');
const path = require('path');
const bcrypt = require('bcrypt');
const Station = require('./models/Station');
const User = require('./models/User');

async function connectDB() {
    let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/polaris';
    
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('MongoDB connected successfully');
    } catch (err) {
        console.log('External/local MongoDB not reachable, starting in-memory MongoDB...');
        const mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        process.env.MONGO_URI = uri;
        await mongoose.connect(uri);
        console.log('In-memory MongoDB connected successfully');
    }

    try {
        const stationCount = await Station.countDocuments();
        if (stationCount === 0) {
            console.log('Database is empty — running initial station & asset seed scripts...');
            const backendRoot = path.join(__dirname, '..');
            const seedEnv = { ...process.env, MONGO_URI: uri };
            execFileSync(process.execPath, [path.join(backendRoot, 'seed.js')], {
                cwd: backendRoot,
                env: seedEnv,
                stdio: 'inherit'
            });
            execFileSync(process.execPath, [path.join(backendRoot, 'src/utils/seedMaitri2.js')], {
                cwd: backendRoot,
                env: seedEnv,
                stdio: 'inherit'
            });
            console.log('Initial database seeding complete.');
        }

        // Always ensure the demo judge account exists
        const demoEmail = 'admin@polaris.gov';
        const existingAdmin = await User.findOne({ email: demoEmail });
        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('password123', salt);
            await User.create({
                name: 'Cmdr. Sharma',
                email: demoEmail,
                password: passwordHash,
                role: 'ADMIN'
            });
            console.log('Created demo judge account: admin@polaris.gov');
        }
    } catch (seedErr) {
        console.error('Database auto-seed warning:', seedErr.message);
    }
}

module.exports = connectDB;
