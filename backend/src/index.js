import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import { connectDB } from './database/db.js';
import { app } from './app.js';

const PORT = process.env.PORT || 3000;

// 1. Create a native HTTP server wrapping Express app
const server = http.createServer(app);

// 2. Initialize Socket.io with CORS configuration
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173", // Frontend Vite React default URL
        methods: ["GET", "POST", "PATCH"],
        credentials: true
    }
});

// 3. Socket.io Real-Time Event Listeners
io.on('connection', (socket) => {
    console.log(`🔌 New client connected to Socket.io: ${socket.id}`);

    // Listener for events sent by worker.js when a message is processed
    socket.on('worker:new_message', (data) => {
        console.log(` Relaying new message event for Contact: ${data.contact?.phoneNumber}`);
        // Broadcasts real-time data to all open React frontend dashboards
        io.emit('dashboard:new_message', data);
    });

    // Listener for when a rescue dispatcher changes victim status (pending -> dispatched)
    socket.on('dispatcher:status_updated', (data) => {
        io.emit('dashboard:status_updated', data);
    });

    socket.on('disconnect', () => {
        console.log(` Client disconnected: ${socket.id}`);
    });
});

// 4. Connect to MongoDB, then start the HTTP server with Socket.io
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(` Server with Socket.io is listening on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed !!! ", err);
    });