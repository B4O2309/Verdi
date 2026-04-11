import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";

export const authMe = async (req, res) => {
    try {
        const user = req.user;

        return res.status(200).json({ user });
    }
    catch (error) {
        console.error('Error during auth me:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const searchUserByUsername = async (req, res) => {
    try {
        const { username } = req.query;

        if (!username || username.trim() === '') {
            return res.status(400).json({ message: 'Username query parameter is required' });
        }

        const user = await User.findOne({ username }).select(
            "_id displayName username avatarUrl"
        );

        return res.status(200).json({ user });
    }
    catch (error) {
        console.error('Error during search user by username:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const uploadAvatar = async (req, res) => {
    try {
        const file = req.file;
        const userId = req.user._id;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadImageFromBuffer(file.buffer);

        const updatedUser = await User.findByIdAndUpdate(userId, { 
            avatarUrl: result.secure_url,
            avatarId: result.public_id
        }, { new: true }).select("avatarUrl");

        if (!updatedUser.avatarUrl) {
            return res.status(404).json({ message: 'Avatar URL not found after upload' });
        }

        return res.status(200).json({ avatarUrl: updatedUser.avatarUrl });
    }
    catch (error) {
        console.error('Error during avatar upload:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { displayName, username, email, phone, bio } = req.body;

        if (username) {
            const existing = await User.findOne({ username, _id: { $ne: userId } });
            if (existing) {
                return res.status(409).json({ message: 'Username already taken' });
            }
        }

        if (email) {
            const existing = await User.findOne({ email, _id: { $ne: userId } });
            if (existing) {
                return res.status(409).json({ message: 'Email already in use' });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { displayName, username, email, phone, bio },
            { new: true, runValidators: true }
        ).select("-hashedPassword");

        return res.status(200).json({ user: updatedUser });
    }
    catch (error) {
        console.error('Error during update profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};