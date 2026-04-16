import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';
import type { SocketState } from '@/types/store';
import { useChatStore } from './useChatStore';
import { useFriendStore } from './useFriendStore';
import { useBlockStore } from './useBlockStore';
import { toast } from 'sonner';

const baseURL = import.meta.env.VITE_SOCKET_URL;

interface TypingState {
    typingUsers: Record<string, { userId: string; displayName: string }[]>;
    setTypingUsers: (conversationId: string, users: { userId: string; displayName: string }[]) => void;
}

export const useTypingStore = create<TypingState>((set) => ({
    typingUsers: {},
    setTypingUsers: (conversationId, users) => set((state) => ({
        typingUsers: { ...state.typingUsers, [conversationId]: users }
    }))
}));

export const useSocketStore = create<SocketState>((set, get) => ({
    socket: null,
    onlineUsers: [],

    connectSocket: () => {
        const accessToken = useAuthStore.getState().accessToken;
        const existingSocket = get().socket;
        if (existingSocket) return;

        const socket: Socket = io(baseURL, {
            auth: { token: accessToken },
            transports: ['websocket'],
        });

        set({ socket });

        socket.on('connect', () => console.log('Connected to socket server'));

        socket.on('online-users', (userIds) => set({ onlineUsers: userIds }));

        socket.on('new-message', async ({ message, conversation, unreadCounts }) => {
            const chatStore = useChatStore.getState();

            const lastMessage = {
                _id: conversation.lastMessage._id,
                content: conversation.lastMessage.content,
                createdAt: conversation.lastMessage.createdAt,
                sender: {
                    _id: conversation.lastMessage.senderId,
                    displayName: [],
                    avatarUrl: null
                }
            };

            const updatedConversation = { ...conversation, lastMessage, unreadCounts };
            const exists = chatStore.conversations.some((c) => c._id === conversation._id);

            if (!exists) {
                await chatStore.fetchConversations();
            }

            useChatStore.getState().updateConversation(updatedConversation);
            await useChatStore.getState().addMessage(message);

            if (useChatStore.getState().activeConversationId === message.conversationId) {
                chatStore.markAsSeen();
            } else {
                const currentUserId = useAuthStore.getState().user?._id;
                if (message.senderId !== currentUserId) {
                    toast.info("You have a new message");
                }
            }

            // Stop typing indicator when a new message is received
            const { typingUsers, setTypingUsers } = useTypingStore.getState();
            const current = typingUsers[message.conversationId] ?? [];
            setTypingUsers(
                message.conversationId,
                current.filter(u => u.userId !== message.senderId)
            );
        });

        socket.on('read-message', ({ conversation, lastMessage }) => {
            const updated = {
                _id: conversation._id,
                lastMessage,
                lastMessageAt: conversation.lastMessageAt,
                unreadCounts: conversation.unreadCounts,
                seenBy: conversation.seenBy,
            };
            useChatStore.getState().updateConversation(updated);
        });

        socket.on('new-conversation', (conversation) => {
            const currentUserId = useAuthStore.getState().user?._id;
            const isCreator = conversation.group?.createdBy === currentUserId;
            useChatStore.getState().addConv(conversation, isCreator);
            socket.emit('join-conversation', conversation._id);
        });

        socket.on('group-renamed', (conversation) => {
            useChatStore.getState().updateConversation(conversation);
        });

        socket.on('group-members-updated', (conversation) => {
            useChatStore.getState().updateConversation(conversation);
        });

        socket.on('user-blocked', ({ blockerId, blockedId }) => {
            const currentUserId = useAuthStore.getState().user?._id;
            if (!currentUserId) return;
            useBlockStore.getState().addBlock(blockerId, blockedId, currentUserId);
        });

        socket.on('user-unblocked', ({ blockerId, blockedId }) => {
            const currentUserId = useAuthStore.getState().user?._id;
            if (!currentUserId) return;
            useBlockStore.getState().removeBlock(blockerId, blockedId, currentUserId);
        });

        socket.on('friend-request-received', (request) => {
            useFriendStore.setState((state) => {
                const exists = state.receivedList.some(r => r._id === request._id);
                if (exists) return state;
                return { receivedList: [request, ...state.receivedList] };
            });
            toast.info(`${request.from.displayName} sent you a friend request!`);
        });

        socket.on('friend-request-accepted', ({ requestId, newFriend }) => {
            useFriendStore.setState((state) => ({
                friends: state.friends.some(f => f._id === newFriend._id.toString())
                    ? state.friends
                    : [newFriend, ...state.friends],
                sentList: state.sentList.filter(r => r._id !== requestId),
                receivedList: state.receivedList.filter(r => r._id !== requestId),
            }));
            toast.success(`You and ${newFriend.displayName} are now friends!`);
        });

        socket.on('friend-request-declined', ({ requestId }) => {
            useFriendStore.setState((state) => ({
                sentList: state.sentList.filter(r => r._id !== requestId),
                receivedList: state.receivedList.filter(r => r._id !== requestId),
            }));
        });

        socket.on('friend-removed', ({ friendId }) => {
            useFriendStore.setState((state) => ({
                friends: state.friends.filter(f => f._id !== friendId)
            }));
        });

        socket.on('user-deleted', ({ deletedUserId, conversationIds }) => {
            useFriendStore.setState((state) => ({
                friends: state.friends.filter(f => f._id !== deletedUserId)
            }));
            useChatStore.getState().removeConversations(conversationIds);
            toast.info("A user you were connected with has deleted their account.");
        });

        socket.on('session-revoked', () => {
            toast.error("You have been logged out remotely.");
            useAuthStore.getState().signOut();
        });

        socket.on('update-online-status', (showOnlineStatus) => {
            // handled in server
        });

        // Typing events
        socket.on('typing-start', ({ conversationId, userId, displayName }) => {
            const { typingUsers, setTypingUsers } = useTypingStore.getState();
            const current = typingUsers[conversationId] ?? [];
            const exists = current.some(u => u.userId === userId);
            if (!exists) {
                setTypingUsers(conversationId, [...current, { userId, displayName }]);
            }
        });

        socket.on('typing-stop', ({ conversationId, userId }) => {
            const { typingUsers, setTypingUsers } = useTypingStore.getState();
            const current = typingUsers[conversationId] ?? [];
            setTypingUsers(conversationId, current.filter(u => u.userId !== userId));
        });

        socket.on('message-reaction', ({ messageId, reactions }) => {
            useChatStore.getState().updateMessageReactions(messageId, reactions);
        });

        socket.on('message-deleted', ({ messageId, conversationId, deletedForEveryone }) => {
            if (deletedForEveryone) {
                useChatStore.getState().updateMessageContent(messageId, null, null);
            }
        });
    },

    disconnectSocket: () => {
        const socket = get().socket;
        if (socket) {
            socket.disconnect();
            set({ socket: null });
            console.log('Disconnected from socket server');
        }
    }
}));