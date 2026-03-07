export const updateConversationAfterCreateMessage = (
  conversation,
  message,
  senderId
) => {
  conversation.seenBy = [senderId];
  conversation.lastMessageAt = message.createdAt;

  // Use .set() and ensure we are passing a plain object or the correct fields
  conversation.lastMessage = {
    _id: message._id,
    content: message.content ?? null,
    senderId: senderId,
    createdAt: message.createdAt,
  };

  // Force Mongoose to track changes on this path
  conversation.markModified('lastMessage');

  if (!conversation.unreadCount) {
    conversation.unreadCount = new Map();
  }

  conversation.participants.forEach((p) => {
    const memberId = p.userId.toString();
    const isSender = memberId === senderId.toString();
    
    // Safely use Map methods
    const prevCount = conversation.unreadCount.get(memberId) || 0;
    conversation.unreadCount.set(memberId, isSender ? 0 : prevCount + 1);
  });
};