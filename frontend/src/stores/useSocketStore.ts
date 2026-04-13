import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';
import type { SocketState } from '@/types/store';
import { useChatStore } from './useChatStore';
import { useFriendStore } from './useFriendStore';
import { toast } from 'sonner';
import { useBlockStore } from './useBlockStore';

const baseURL = import.meta.env.VITE_SOCKET_URL;

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

        socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        socket.on('online-users', (userIds) => {
            set({ onlineUsers: userIds });
        });

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
                // Fetch conversations if it's a new one
                await chatStore.fetchConversations();
            }

            useChatStore.getState().updateConversation(updatedConversation);

            await chatStore.addMessage(message);

            if (useChatStore.getState().activeConversationId === message.conversationId) {
                useChatStore.getState().markAsSeen();
            }
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
                useChatStore.getState().markAsSeen();
            }
        });

        socket.on('group-renamed', (conversation) => {
            useChatStore.getState().updateConversation(conversation);
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

        socket.on('friend-request-received', (request) => {
            useFriendStore.setState((state) => {
                const exists = state.receivedList.some(r => r._id === request._id);
                if (exists) return state;
                return { receivedList: [request, ...state.receivedList] };
            });
            toast.info(`${request.from.displayName} sent you a friend request!`);
        });

        socket.on('friend-request-sent', (request) => {
            useFriendStore.setState((state) => {
                // Prevent duplicate requests
                const exists = state.sentList.some((r) => r._id === request._id);
                if (exists) return state;
                
                return { sentList: [request, ...state.sentList] };
            });
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