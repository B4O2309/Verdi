export const updateConversationAfterCreateMessage = (
    conversation,
    message,
    senderId
) => {
    conversation.seenBy = [senderId];
    conversation.lastMessageAt = message.createdAt;

    conversation.lastMessage = {
        _id: message._id,
        content: message.content ?? null,
        senderId: senderId,
        createdAt: message.createdAt,
    };

    conversation.markModified('lastMessage');

    if (!conversation.unreadCount) {
        conversation.unreadCount = new Map();
    }

    conversation.participants.forEach((p) => {
        const memberId = p.userId.toString();
        const isSender = memberId === senderId.toString();
        const prevCount = conversation.unreadCount.get(memberId) || 0;
        conversation.unreadCount.set(memberId, isSender ? 0 : prevCount + 1);
    });
};

export const emitNewMessage = (io, conversation, message) => {
    const unreadCounts = Object.fromEntries(conversation.unreadCount ?? new Map());

    const payload = {
        message,
        conversation: {
            _id: conversation._id,
            lastMessage: conversation.lastMessage,
            lastMessageAt: conversation.lastMessageAt,
        },
        unreadCounts,
    };

    io.to(conversation._id.toString()).emit("new-message", payload);

    conversation.participants.forEach((p) => {
        const participantId = p.userId.toString();
        io.to(participantId).emit("new-message", payload);
    });
};