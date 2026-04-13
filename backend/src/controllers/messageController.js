import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { emitNewMessage, updateConversationAfterCreateMessage } from "../utils/messageHelper.js";
import { io } from "../socket/index.js";
import { uploadImageFromBuffer } from "../middlewares/uploadMiddleware.js";
import Block from "../models/Block.js";

export const uploadMessageImage = async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const result = await uploadImageFromBuffer(file.buffer, {
            folder: 'verdi-chat/messages',
            transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });

        return res.status(200).json({ imgUrl: result.secure_url });
    }
    catch (error) {
        console.error('Error uploading message image:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const sendDirectMessage = async (req, res) => {
    try {
        const { recipientId, content, conversationId, imgUrl } = req.body;
        const senderId = req.user.id;

        if (!content && !imgUrl) {
            return res.status(400).json({ message: 'Message content or image is required' });
        }
        
        const [iBlocked, theyBlocked] = await Promise.all([
            Block.exists({ blocker: senderId, blocked: recipientId }),
            Block.exists({ blocker: recipientId, blocked: senderId })
        ]);

        if (iBlocked) {
            return res.status(403).json({ message: 'You have blocked this user' });
        }
        if (theyBlocked) {
            return res.status(403).json({ message: 'You cannot send messages to this user' });
        }

        let conversation;
        let isNewConversation = false;

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        }

        if (!conversation) {
            conversation = await Conversation.create({
                type: 'direct',
                participants: [
                    { userId: senderId, joinedAt: new Date() },
                    { userId: recipientId, joinedAt: new Date() }
                ],
                unreadCount: new Map()
            });
            isNewConversation = true;
        }

        const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            content: content || null,
            imgUrl: imgUrl || null
        });

        const participantIds = conversation.participants.map(p => p.userId);
        await Conversation.findByIdAndUpdate(conversation._id, {
            $pull: { hiddenBy: { $in: participantIds } }
        });

        updateConversationAfterCreateMessage(conversation, message, senderId);
        await conversation.save();

        if (isNewConversation) {
            await conversation.populate({
                path: 'participants.userId',
                select: 'displayName avatarUrl username'
            });

            const participants = conversation.participants.map(p => ({
                _id: p.userId?._id,
                displayName: p.userId?.displayName,
                avatarUrl: p.userId?.avatarUrl ?? null,
                username: p.userId?.username,
                joinedAt: p.joinedAt
            }));

            const formatted = { ...conversation.toObject(), participants };

            io.to(senderId.toString()).emit('new-conversation', formatted);
            io.to(recipientId.toString()).emit('new-conversation', formatted);
        }

        emitNewMessage(io, conversation, message);

        return res.status(201).json({ message: 'Message sent successfully', data: message });
    }
    catch (error) {
        console.error('Error sending direct message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { conversationId, content, imgUrl } = req.body;
        const senderId = req.user.id;
        const conversation = req.conversation;

        if (!content && !imgUrl) {
            return res.status(400).json({ message: 'Message content or image is required' });
        }

        const message = await Message.create({
            conversationId,
            senderId,
            content: content || null,
            imgUrl: imgUrl || null
        });

        const participantIds = conversation.participants.map(p => p.userId);
        await Conversation.findByIdAndUpdate(conversationId, {
            $pull: { hiddenBy: { $in: participantIds } }
        });

        updateConversationAfterCreateMessage(conversation, message, senderId);
        await conversation.save();
        emitNewMessage(io, conversation, message);

        return res.status(201).json({ message: 'Message sent successfully', data: message });
    }
    catch (error) {
        console.error('Error sending group message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};