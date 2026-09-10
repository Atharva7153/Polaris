const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function connectDB() {
    let uri = process.env.MONGO_URI || 'mongodb://localhost:27017/polaris';
    
    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log('MongoDB connected successfully to', uri);
    } catch (err) {
        console.log('Local MongoDB not running, starting in-memory MongoDB...');
        const mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        await mongoose.connect(uri);
        console.log('In-memory MongoDB connected successfully to', uri);
    }
}

module.exports = connectDB;
