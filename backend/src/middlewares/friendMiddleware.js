import express from "express";
import Conversation from "../models/Conversation.js";
import Friend from "../models/Friend.js";

const pair = (a,b) => (a < b ? [a,b] : [b,a]);

export const checkFriendship = async (req, res, next) => {
    try {
        const me = req.user.id.toString();

        const recipientId = req.body?.recipientId || (req.body?.memberIds && req.body.memberIds[0]);

        if (!recipientId) {
            return res.status(400).json({ message: 'Recipient ID is required' });
        }

        if (recipientId) {
            const [userA, userB] = pair(me, recipientId);

            const isFriend = await Friend.findOne({ userA, userB });

            if (!isFriend) {
                return res.status(403).json({ message: 'You are not friends with this user' });
            }
        }

        next();
        // Group Chat

    }
    catch (error) {
        console.error('Error checking friendship:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const checkGroupMembership = async (req, res, next) => {
    try {
        const { conversationId } = req.body;
        const userId = req.user.id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const isMember = conversation.participants.some((p) => p.userId.toString() === userId.toString());

        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }

        req.conversation = conversation;
        next();
    }
    catch (error) {
        console.error('Error checking group membership:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};