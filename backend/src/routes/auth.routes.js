import { Router } from 'express';
import { loginDispatcher, logoutDispatcher, refreshAccessToken } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', loginDispatcher);
router.post('/refresh-token', refreshAccessToken);

// Secured routes (Requires a valid Access Token to log out)
router.post('/logout', verifyJWT, logoutDispatcher);

export default router;