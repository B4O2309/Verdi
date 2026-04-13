import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './libs/db.js';
import authRoute from './routes/authRoute.js';
import friendRoute from './routes/friendRoute.js';
import messageRoute from './routes/messageRoute.js';
import conversationRoute from './routes/conversationRoute.js';
import userRoute from './routes/userRoute.js';
import cookieParser from 'cookie-parser';
import { protectedRoute } from './middlewares/authMiddleware.js';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import { app, server } from './socket/index.js';
import { v2 as cloudinary } from 'cloudinary';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from './models/User.js';
import blockRoute from './routes/blockRoute.js';

dotenv.config();

// const app = express();
const PORT = process.env.PORT || 5001;

//Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: process.env.CLIENT_URL, credentials: true}))

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), null);

        const googleAvatarUrl = profile.photos?.[0]?.value ?? null;

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            user = await User.findOne({ email });

            if (user) {
                user.googleId = profile.id;
                if (!user.avatarUrl) {
                    user.avatarUrl = googleAvatarUrl;
                }
                await user.save();
            } else {
                user = await User.create({
                    googleId: profile.id,
                    email,
                    displayName: profile.displayName,
                    avatarUrl: googleAvatarUrl,
                });
            }
        } else {
            const isUsingGoogleAvatar = user.avatarUrl?.includes('googleusercontent.com');
            if (isUsingGoogleAvatar && googleAvatarUrl && user.avatarUrl !== googleAvatarUrl) {
                user.avatarUrl = googleAvatarUrl;
                await user.save();
            }
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));
app.use(passport.initialize());

// Cloudinary configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Swagger 
const swaggerDocument = JSON.parse(fs.readFileSync('./src/swagger.json', 'utf-8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//Public route
app.use('/api/auth', authRoute);

//Private route
app.use(protectedRoute);
app.use('/api/users', userRoute);
app.use('/api/friends', friendRoute);
app.use('/api/messages', messageRoute);
app.use('/api/conversations', conversationRoute);
app.use('/api/blocks', blockRoute);

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});