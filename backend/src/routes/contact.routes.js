import { Router } from 'express';
import { 
    getAllContacts, 
    getContactById,
    updateRescueStatus,
    getRescueStats
} from '../controllers/contact.controller.js';

const router = Router();

router.route('/').get(getAllContacts);
router.route('/stats').get(getRescueStats);
router.route('/:contactId').get(getContactById);
router.route('/:contactId/status').patch(updateRescueStatus);

export default router;