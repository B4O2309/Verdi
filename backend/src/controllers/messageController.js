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
        const { recipientId, content, conversationId, imgUrl, replyTo } = req.body;
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
            imgUrl: imgUrl || null,
            replyTo: replyTo || null
        });

        if (message.replyTo) {
            await message.populate({
                path: 'replyTo',
                select: 'content imgUrl senderId'
            });
        }

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

            const unreadCounts = conversation.unreadCount ? Object.fromEntries(conversation.unreadCount) : {};
            const formatted = { ...conversation.toObject(), unreadCounts, participants };

            const senderSockets = await io.in(senderId.toString()).fetchSockets();
            const recipientSockets = await io.in(recipientId.toString()).fetchSockets();
            
            senderSockets.forEach(s => s.join(conversation._id.toString()));
            recipientSockets.forEach(s => s.join(conversation._id.toString()));

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
        const { conversationId, content, imgUrl, replyTo } = req.body;
        const senderId = req.user.id;
        const conversation = req.conversation;

        if (!content && !imgUrl) {
            return res.status(400).json({ message: 'Message content or image is required' });
        }

        const message = await Message.create({
            conversationId,
            senderId,
            content: content || null,
            imgUrl: imgUrl || null,
            replyTo: replyTo || null
        });

        if (message.replyTo) {
             await message.populate({
                path: 'replyTo',
                select: 'content imgUrl senderId',
                populate: {
                    path: 'senderId',
                    select: 'displayName'
                }
             });
        }

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

export const toggleReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.senderId.toString() === userId.toString()) {
            return res.status(403).json({ message: 'You cannot react to your own message' });
        }

        const existingIdx = message.reactions.findIndex(
            r => r.userId.toString() === userId.toString() && r.emoji === emoji
        );

        if (existingIdx > -1) {
            // Check if user has already reacted with the same emoji → remove reaction
            message.reactions.splice(existingIdx, 1);
        } else {
            // Check if user has reacted with a different emoji → update to new emoji
            const otherEmojiIdx = message.reactions.findIndex(
                r => r.userId.toString() === userId.toString()
            );
            if (otherEmojiIdx > -1) {
                message.reactions.splice(otherEmojiIdx, 1);
            }
            message.reactions.push({ userId, emoji });
        }

        await message.save();

        // Emit socket to sync realtime
        io.to(message.conversationId.toString()).emit('message-reaction', {
            messageId: message._id,
            reactions: message.reactions
        });

        return res.status(200).json({ reactions: message.reactions });
    }
    catch (error) {
        console.error('Error toggling reaction:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { deleteForEveryone } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (deleteForEveryone) {
            // Only sender can delete for everyone
            if (message.senderId.toString() !== userId.toString()) {
                return res.status(403).json({ message: 'You can only unsend your own messages' });
            }

            message.deletedForEveryone = true;
            message.content = null;
            message.imgUrl = null;
            await message.save();

            // Notify all participants in the conversation
            io.to(message.conversationId.toString()).emit('message-deleted', {
                messageId: message._id,
                conversationId: message.conversationId,
                deletedForEveryone: true
            });
        } else {
            // Only mark as deleted for the user (soft delete)
            await Message.findByIdAndUpdate(messageId, {
                $addToSet: { deletedBy: userId }
            });

            // No need to emit socket because it only affects the user themselves
        }

        return res.status(200).json({ message: 'Message deleted' });
    }
    catch (error) {
        console.error('Error deleting message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};