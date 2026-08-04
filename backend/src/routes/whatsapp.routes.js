import express from 'express';
import { handleIncomingMessage } from '../controllers/whatsapp.controller.js';

const router = express.Router();

// POST /api/whatsapp
router.post('/', handleIncomingMessage);

export default router;