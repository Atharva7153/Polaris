const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@<cluster-url>/polaris?retryWrites=true&w=majority')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stations', require('./routes/stations'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/simulation', require('./routes/simulation'));

const intelligenceService = require('./services/intelligenceService');
app.get('/api/health', async (req, res) => {
    const mlHealth = await intelligenceService.getHealth();
    res.json({
        backend: "healthy",
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        ml: mlHealth.status === "UNAVAILABLE" ? "unavailable" : "connected"
    });
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
    }
});

// Expose io to routes
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
