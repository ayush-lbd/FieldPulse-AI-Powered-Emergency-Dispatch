import { connectQueue } from '../queue.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Routes imports
import whatsappRoutes from './routes/whatsapp.routes.js';
import contactRouter from './routes/contact.routes.js';
import messageRouter from './routes/message.routes.js';

import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

// Initialize RabbitMQ Queue connection
connectQueue();

// Security and parser middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Standard middleware to parse JSON and URL-encoded data
// Meta sends JSON payloads for messages and events
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

// --- API ROUTES ---
// Ingestion Webhook Route
app.use('/api/v1/whatsapp', whatsappRoutes);

// Dashboard API Routes
app.use('/api/v1/contacts', contactRouter);
app.use('/api/v1/messages', messageRouter);

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json(
        new ApiResponse(200, { uptime: process.uptime() }, "Server is up and running!")
    );
});

export { app };