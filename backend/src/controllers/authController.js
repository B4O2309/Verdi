import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';

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
