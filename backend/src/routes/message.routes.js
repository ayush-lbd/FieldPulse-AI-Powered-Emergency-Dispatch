import { Router } from 'express';
import { getMessagesByContact, sendManualReply } from '../controllers/message.controller.js';

const router = Router();

// Fetch message history for the dashboard
router.get('/:contactId', getMessagesByContact);

// --- NEW: The missing route for the manual dispatcher reply! ---
router.post('/:contactId/reply', sendManualReply);

export default router;