import { connectQueue } from '../queue.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import whatsappRoutes from './routes/whatsapp.routes.js';
import { ApiResponse } from './utils/ApiResponse.js';

const app = express();

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

// Mount the WhatsApp routes
app.use('/api/whatsapp', whatsappRoutes);

app.get('/health', (req, res) => {
    res.status(200).json(
        new ApiResponse(200, { uptime: process.uptime() }, "Server is up and running!")
    );
});

export { app };