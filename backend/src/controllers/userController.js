import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const authMe = async (req, res) => {
    try {
        const user = req.user;
        const userWithPassword = await User.findById(user._id).select('hashedPassword');

        return res.status(200).json({
            user: {
                ...user.toObject(),
                hasPassword: !!userWithPassword.hashedPassword,
            }
        });
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

export const updateOnlineStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { showOnlineStatus } = req.body;

        if (typeof showOnlineStatus !== 'boolean') {
            return res.status(400).json({ message: 'showOnlineStatus must be a boolean' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { showOnlineStatus },
            { new: true }
        ).select("-hashedPassword");

        return res.status(200).json({ user: updatedUser });
    }
    catch (error) {
        console.error('Error during update online status:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(userId);
        const isMatch = await bcrypt.compare(oldPassword, user.hashedPassword);

        if (!isMatch) {
            return res.status(401).json({ message: 'Old password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(userId, { hashedPassword });

        return res.status(200).json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Error during change password:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select(
            "_id displayName username avatarUrl bio"
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.status(200).json({ user });
    }
    catch (error) {
        console.error('Error during get user by id:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};