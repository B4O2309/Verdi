import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { updateConversationAfterCreateMessage } from "../utils/messageHelper.js";

export const sendDirectMessage = async (req, res) => {
    try {
        const { recipientId, content, conversationId } = req.body;  
        const senderId = req.user.id;

        let conversation;

        if (!content) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        if (conversationId) {
            conversation = await Conversation.findById(conversationId);
        }

        if (!conversation) {
            conversation = await Conversation.create({
                type: 'direct',
                participants: [
                    {userId: senderId, joinedAt: new Date()},
                    {userId: recipientId, joinedAt: new Date()}
                ],
                unreadCount: new Map()
            })
        }

        const message = await Message.create({
            conversationId: conversation._id,
            senderId,
            content
        });

        console.log('message.content:', message.content);

        updateConversationAfterCreateMessage(conversation, message, senderId);

        await conversation.save();
        return res.status(201).json({ message: 'Message sent successfully', data: message });
    }
    catch (error) {
        console.error('Error sending direct message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const sendGroupMessage = async (req, res) => {
    try {
        const { conversationId, content } = req.body;
        const senderId = req.user.id;
        const conversation = req.conversation;

        if (!content) {
            return res.status(400).json({ message: 'Message content is required' });
        }

        const message = await Message.create({
            conversationId,
            senderId,
            content
        }); 

        updateConversationAfterCreateMessage(conversation, message, senderId);

        await conversation.save();
        return res.status(201).json({ message: 'Message sent successfully', data: message });
    }
    catch (error) {
        console.error('Error sending group message:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
