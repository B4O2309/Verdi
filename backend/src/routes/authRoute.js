import express from 'express';
import { signUp, signIn, signOut, refreshToken, forgotPassword, verifyOtp, resetPassword, googleCallback } from '../controllers/authController.js';
import passport from 'passport';

const router = express.Router();

router.post("/signup", signUp);

router.post("/signin", signIn)

router.post("/signout", signOut);

router.post("/refresh", refreshToken);

router.post("/forgot-password", forgotPassword); 

router.post("/verify-otp", verifyOtp);

router.post("/reset-password", resetPassword); 

// Google OAuth
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", passport.authenticate("google", { session: false, failureRedirect: "/signin" }), googleCallback);

export default router;