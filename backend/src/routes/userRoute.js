import express from 'express';
import { authMe, searchUserByUsername, updateProfile, uploadAvatar, updateOnlineStatus, changePassword, getUserById } from '../controllers/userController.js';
import {upload} from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get('/me', authMe);
router.put('/me', updateProfile);
router.put('/me/online-status', updateOnlineStatus);
router.put('/me/change-password', changePassword);
router.get('/search', searchUserByUsername);
router.get('/:id', getUserById);
router.post('/uploadAvatar', upload.single("file"), uploadAvatar);

export default router;