import express from 'express';
import { verifyWebhook, handleIncomingMessage } from '../controllers/whatsapp.controller.js';

const router = express.Router();

// GET /api/whatsapp - Verification handshake required by Meta
router.get('/', verifyWebhook);

// POST /api/whatsapp - Incoming WhatsApp messages and media
router.post('/', handleIncomingMessage);

export default router;