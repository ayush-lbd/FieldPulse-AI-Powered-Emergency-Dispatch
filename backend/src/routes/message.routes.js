import { Router } from 'express';
import { getMessagesByContact } from '../controllers/message.controller.js';

const router = Router();

router.route('/:contactId').get(getMessagesByContact);

export default router;