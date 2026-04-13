import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';
import OTP from '../models/OTP.js';
import nodemailer from 'nodemailer';

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

const ACCESS_TOKEN_TTL = '30m'; // Normally, 15 minutes
// Day * Hour * Minute * Second * Millisecond
const REFRESH_TOKEN_TTL = 14 * 24* 60 * 60 * 1000; // Normally, 7 days in seconds

export const signUp = async (req, res) => {
    try {
        const { username, password, email, firstName, lastName } = req.body;
        if (!username || !password || !email || !firstName || !lastName) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user already exists
        const duplicate = await User.findOne({username})

        if (duplicate) {
            return res.status(409).json({ message: 'Username already taken' });
        }
        
        // Check duplicate email
        const duplicateEmail = await User.findOne({ email });
        if (duplicateEmail) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

        // Save user to database
        await User.create({
            username,
            hashedPassword,
            email,
            displayName: `${lastName} ${firstName}`,
        });
        // Respond with success
        return res.sendStatus(204);
    } catch (error) {
        console.error('Error during sign up:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const signIn = async (req, res) => {
    try {
        // Take input
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Take hashedPassword from DB to compare with input password
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

        if (!passwordCorrect) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // If match, create accessToken with JWT
        const accessToken = jwt.sign(
            {userId: user._id}, 
            process.env.ACCESS_TOKEN_SECRET, 
            {expiresIn: ACCESS_TOKEN_TTL}
        );

        // Create refreshToken with JWT
        const refreshToken = crypto.randomBytes(64).toString('hex');
        

        // Create new session to store refreshToken
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
        });

        // Respond with refreshToken in cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // Accessible only by web server
            secure: true, // Set secure flag in production
            sameSite: 'none', // backend, frontend on different domains
            maxAge: REFRESH_TOKEN_TTL,
        });
        // Respond with accessToken in response body
        return res.status(200).json({ message: `User ${username} signed in successfully`, accessToken });
    }
    catch (error) {
        console.error('Error during sign in:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const signOut = async (req, res) => {
    try {
        // Take refreshToken from cookie
        const token = req.cookies.refreshToken;

        if (token) {
            // Delete refreshToken from sessions collection
            await Session.deleteOne({ refreshToken: token });
            
            // Clear cookie
            res.clearCookie('refreshToken');
        }

        return res.sendStatus(204);
    }
    catch (error) {
        console.error('Error during sign out:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Refresh access token
export const refreshToken = async (req, res) => {
    try {
        // Take refreshToken from cookie
        const token = req.cookies?.refreshToken;
        if (!token) {
            return res.status(401).json({ message: 'Token is required' });
        }

        // Compare with refreshToken in db
        const session = await Session.findOne({ refreshToken: token });
        if (!session) {
            return res.status(403).json({ message: 'Token is invalid' });
        }

        // Check if expired
        if (session.expiresAt < new Date()) {
            return res.status(403).json({ message: 'Token has expired, please sign in again' });
        }

        // Create new accessToken
        const accessToken = jwt.sign(
            { userId: session.userId },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );
         
        // return new accessToken
        return res.status(200).json({ accessToken });
    }
    catch (error) {
        console.error('Error occurred while refreshing token:', error);
        return res.status(500).json({ message: 'System error' });
    }
};

export const forgotPassword = async (req, res) => {
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
    try {
        const transporter = createTransporter();
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
        }

        // Delete any existing OTP for this email to prevent multiple valid OTPs
        await OTP.deleteMany({ email });

        // Generate 6-digit OTP and save to database with expiration
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await OTP.create({ email, otp, expiresAt });

        await transporter.sendMail({
            from: `"Verdi" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verdi Password Reset Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <h2 style="color: #6366f1;">Password Reset</h2>
                    <p>Your verification code is:</p>
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #6366f1; margin: 24px 0;">
                        ${otp}
                    </div>
                    <p style="color: #6b7280;">This code expires in <strong>10 minutes</strong>.</p>
                    <p style="color: #6b7280;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        });

        return res.status(200).json({ message: 'OTP sent to your email' });
    }
    catch (error) {
        console.error('Error during forgot password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// OTP verification
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const record = await OTP.findOne({ email });

        if (!record) {
            return res.status(400).json({ message: 'OTP not found or expired' });
        }

        if (record.expiresAt < new Date()) {
            await OTP.deleteMany({ email });
            return res.status(400).json({ message: 'OTP has expired' });
        }

        if (record.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        return res.status(200).json({ message: 'OTP verified' });
    }
    catch (error) {
        console.error('Error during OTP verification:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Reset password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const record = await OTP.findOne({ email });

        if (!record || record.otp !== otp || record.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findOneAndUpdate({ email }, { hashedPassword });

        // Delete the OTP after successful password reset
        await OTP.deleteMany({ email });

        return res.status(200).json({ message: 'Password reset successfully' });
    }
    catch (error) {
        console.error('Error during reset password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const googleCallback = async (req, res) => {
    try {
        const user = req.user;

        // Fetch fresh user data to ensure we have the latest info (especially avatarUrl)
        const freshUser = await User.findById(user._id).select('-hashedPassword');

        const accessToken = jwt.sign(
            { userId: freshUser._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_TTL }
        );

        const refreshToken = crypto.randomBytes(64).toString('hex');

        await Session.create({
            userId: freshUser._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: REFRESH_TOKEN_TTL
        });

        return res.redirect(`${process.env.CLIENT_URL}/auth/google/callback?accessToken=${accessToken}`);
    }
    catch (error) {
        console.error('Error during Google callback:', error);
        return res.redirect(`${process.env.CLIENT_URL}/signin?error=google_auth_failed`);
    }
};
