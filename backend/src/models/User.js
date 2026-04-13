import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        sparse: true // Allows multiple null values
    },
    hashedPassword: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    avatarUrl: {
        type: String,
    },
    avatarId: {
        type: String,
    },
    bio: {
        type: String,
        maxlength: 500
    },
    phone: {
        type: String,
        sparse: true // Allows multiple null values
    },
    showOnlineStatus: {
        type: Boolean,
        default: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
},
{
    timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;