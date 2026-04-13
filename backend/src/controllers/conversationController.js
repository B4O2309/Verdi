import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { io } from '../socket/index.js';

export const createConversation = async (req, res) => {
    try {
        const { type, name, memberIds } = req.body;
        const userId = req.user._id;

        if (!type || (type === 'group' && !name) || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: 'Invalid input data' });
        }

        let conversation;

        if (type === 'direct') {
            const participantId = memberIds[0];
            conversation = await Conversation.findOne({
                type: 'direct',
                "participants.userId": { $all: [userId, participantId] }
            });

            if (!conversation) {
                conversation = new Conversation({
                    type: 'direct',
                    participants: [{ userId }, { userId: participantId }],
                    lastMessageAt: new Date(),
                });
                await conversation.save();
            } else {
                // If conversation exists, ensure it's not hidden or deleted for the current user
                await Conversation.findByIdAndUpdate(conversation._id, {
                    $pull: {
                        hiddenBy: userId,
                        deletedBy: { userId }
                    }
                });
            }
        }

        if (type === 'group') {
            conversation = new Conversation({
                type: 'group',
                group: { name, createdBy: userId },
                participants: [{ userId, joinedAt: new Date() }, ...memberIds.map(id => ({ userId: id, joinedAt: new Date() }))],
                lastMessageAt: new Date(),
            });
            await conversation.save();
        }

        if (!conversation) {
            return res.status(400).json({ message: 'Failed to create conversation' });
        }

        await conversation.populate([
            { path: 'participants.userId', select: 'displayName avatarUrl username' },
            { path: 'seenBy', select: 'displayName avatarUrl' },
            { path: 'lastMessage.senderId', select: 'displayName avatarUrl' }
        ]);

        const participants = (conversation.participants || []).map((p) => ({
            _id: p.userId?._id,
            displayName: p.userId?.displayName,
            avatarUrl: p.userId?.avatarUrl ?? null,
            joinedAt: p.joinedAt
        }));

        const formatted = { ...conversation.toObject(), participants };

        if (type === "group") {
            memberIds.forEach((userId) => {
                io.to(userId).emit('new-conversation', formatted);
            });
        }

        return res.status(201).json({ conversation: formatted });
    }
    catch (error) {
        console.error('Error creating conversation:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({
            "participants.userId": userId,
            hiddenBy: { $ne: userId }, // Only filter hidden conversations
        })
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .populate({ path: 'participants.userId', select: 'displayName avatarUrl username' })
        .populate({ path: 'lastMessage.senderId', select: 'displayName avatarUrl' })
        .populate({ path: 'seenBy', select: 'displayName avatarUrl' });

        const formatted = conversations.map((conv) => {
            const participants = (conv.participants || []).map((p) => ({
                _id: p.userId?._id,
                displayName: p.userId?.displayName,
                avatarUrl: p.userId?.avatarUrl ?? null,
                username: p.userId?.username ?? null,
                joinedAt: p.joinedAt
            }));

            return { ...conv.toObject(), unreadCount: conv.unreadCount || {}, participants };
        });

        return res.status(200).json({ conversations: formatted });
    }
    catch (error) {
        console.error('Error fetching conversations:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 50, cursor } = req.query;
        const userId = req.user._id;

        // If conversation is deleted for this user, only return messages created after deletedAt
        const conversation = await Conversation.findById(conversationId).lean();
        const deleteRecord = conversation?.deletedBy?.find(
            (d) => d.userId.toString() === userId.toString()
        );

        const query = { conversationId };

        if (deleteRecord) {
            query.createdAt = { $gt: deleteRecord.deletedAt };
        }

        if (cursor) {
            query.createdAt = { ...query.createdAt, $lt: new Date(cursor) };
        }

        let messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) + 1);

        let nextCursor = null;
        if (messages.length > Number(limit)) {
            const nextMessage = messages[messages.length - 1];
            nextCursor = nextMessage.createdAt.toISOString();
            messages.pop();
        }

        messages = messages.reverse();
        return res.status(200).json({ messages, nextCursor });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUserConversationsForSocketIO = async (userId) => {
    try {
        const conversations = await Conversation.find(
            { "participants.userId": userId },
            { _id: 1 }
        );
        return conversations.map((c) => c._id.toString());
    }
    catch (error) {
        console.error('Error fetching user conversations for Socket.IO:', error);
        return [];
    }
};

export const markAsSeen = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id.toString();

        const conversation = await Conversation.findById(conversationId).lean();
        if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

        const last = conversation.lastMessage;
        if (!last) return res.status(200).json({ message: 'No messages to mark as read' });
        if (last.senderId.toString() === userId) return res.status(200).json({ message: 'No messages to mark as read' });

        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            { $addToSet: { seenBy: userId }, $set: { [`unreadCount.${userId}`]: 0 } },
            { new: true }
        );

        const unreadCounts = Object.fromEntries(updated.unreadCount);

        io.to(conversationId).emit('read-message', {
            conversation: { ...updated.toObject(), unreadCounts },
            lastMessage: {
                _id: updated?.lastMessage._id,
                content: updated?.lastMessage.content,
                createdAt: updated?.lastMessage.createdAt,
                sender: { _id: updated?.lastMessage.senderId }
            }
        });

        return res.status(200).json({
            message: 'Conversation marked as seen',
            seenBy: updated?.seenBy || [],
            myUnreadCount: updated?.unreadCount.get(userId) || 0
        });
    }
    catch (error) {
        console.error('Error marking conversation as seen:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const hideConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        await Conversation.findByIdAndUpdate(conversationId, {
            $addToSet: { hiddenBy: userId }
        });

        return res.status(200).json({ message: 'Conversation hidden' });
    }
    catch (error) {
        console.error('Error hiding conversation:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        // Delete record if already exists to update deletedAt timestamp, and ensure it's not duplicated
        await Conversation.findByIdAndUpdate(conversationId, {
            $pull: { deletedBy: { userId } }
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            $push: { deletedBy: { userId, deletedAt: new Date() } },
            $addToSet: { hiddenBy: userId }
        });

        return res.status(200).json({ message: 'Conversation deleted' });
    }
    catch (error) {
        console.error('Error deleting conversation:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const renameGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { name } = req.body;
        const userId = req.user._id;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Group name is required' });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation || conversation.type !== 'group') {
            return res.status(404).json({ message: 'Group conversation not found' });
        }

        // Only allow group members to rename the group
        const isMember = conversation.participants.some(
            p => p.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }

        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            { 'group.name': name.trim() },
            { new: true }
        ).populate({ path: 'participants.userId', select: 'displayName avatarUrl username' });

        const participants = updated.participants.map(p => ({
            _id: p.userId?._id,
            displayName: p.userId?.displayName,
            avatarUrl: p.userId?.avatarUrl ?? null,
            username: p.userId?.username ?? null,
            joinedAt: p.joinedAt
        }));

        const formatted = { ...updated.toObject(), participants };

        // Only allow group members to rename the group
        io.to(conversationId).emit('group-renamed', formatted);

        return res.status(200).json({ conversation: formatted });
    }
    catch (error) {
        console.error('Error renaming group:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const addGroupMembers = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { memberIds } = req.body;
        const userId = req.user._id;

        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: 'memberIds is required' });
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation || conversation.type !== 'group') {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Only allow group members to add new members
        const isMember = conversation.participants.some(
            p => p.userId.toString() === userId.toString()
        );
        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }

        // Only add members that are not already in the group
        const existingIds = conversation.participants.map(p => p.userId.toString());
        const newMemberIds = memberIds.filter(id => !existingIds.includes(id));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ message: 'All selected users are already in the group' });
        }

        const newParticipants = newMemberIds.map(id => ({ userId: id, joinedAt: new Date() }));

        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            { $push: { participants: { $each: newParticipants } } },
            { new: true }
        ).populate({ path: 'participants.userId', select: 'displayName avatarUrl username' });

        const participants = updated.participants.map(p => ({
            _id: p.userId?._id,
            displayName: p.userId?.displayName,
            avatarUrl: p.userId?.avatarUrl ?? null,
            username: p.userId?.username,
            joinedAt: p.joinedAt
        }));

        const formatted = { ...updated.toObject(), participants };

        // Only allow group members to add new members
        io.to(conversationId).emit('group-members-updated', formatted);

        // Only allow group members to add new members
        newMemberIds.forEach(id => {
            io.to(id).emit('new-conversation', formatted);
        });

        return res.status(200).json({ conversation: formatted });
    }
    catch (error) {
        console.error('Error adding group members:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation || conversation.type !== 'group') {
            return res.status(404).json({ message: 'Group not found' });
        }

        const isMember = conversation.participants.some(
            p => p.userId.toString() === userId.toString()
        );

        if (!isMember) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }

        const updated = await Conversation.findByIdAndUpdate(
            conversationId,
            { $pull: { participants: { userId } } },
            { new: true }
        ).populate({ path: 'participants.userId', select: 'displayName avatarUrl username' });

        const participants = updated.participants.map(p => ({
            _id: p.userId?._id,
            displayName: p.userId?.displayName,
            avatarUrl: p.userId?.avatarUrl ?? null,
            username: p.userId?.username,
            joinedAt: p.joinedAt
        }));

        const formatted = { ...updated.toObject(), participants };

        io.to(conversationId).emit('group-members-updated', formatted);

        return res.status(200).json({ message: 'Left group successfully' });
    }
    catch (error) {
        console.error('Error leaving group:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};