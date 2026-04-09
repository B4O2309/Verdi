import {create} from 'zustand';
import { io, type Socket} from 'socket.io-client';
import {useAuthStore} from './useAuthStore';
import type { SocketState } from '@/types/store';
import { useChatStore } from './useChatStore';

const baseURL = import.meta.env.VITE_SOCKET_URL;

export const useSocketStore = create<SocketState>((set, get) => ({
    socket: null,
    onlineUsers: [],

    connectSocket: () => {
        const accessToken = useAuthStore.getState().accessToken;
        const existingSocket = get().socket;

        if (existingSocket) return;

        const socket: Socket = io(baseURL, {
            auth: {token: accessToken},
            transports: ['websocket'],
        });

        set({socket});

        socket.on('connect', () => {
            console.log('Connected to socket server');
        });

        // Online users update
        socket.on('online-users', (userIds) => {
            set({onlineUsers: userIds});
        });

        // New message received
        socket.on('new-message', ({message, conversation, unreadCounts}) => {
            useChatStore .getState().addMessage(message);

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

            const updatedConversation = {
                ...conversation,
                lastMessage,
                unreadCounts
            }

            useChatStore.getState().updateConversation(updatedConversation);

            if (useChatStore.getState().activeConversationId === message.conversationId) {
                useChatStore.getState().markAsSeen();
    }
        });

        // Read Message
        socket.on('read-message', ({conversation, lastMessage}) => {
            const updated = {
                _id: conversation._id,
                lastMessage,
                lastMessageAt: conversation.lastMessageAt,
                unreadCounts: conversation.unreadCounts,
                seenBy: conversation.seenBy,
            };

            useChatStore.getState().updateConversation(updated);
        });

        // New Group Conversation
        socket.on('new-conversation', (conversation) => {
            useChatStore.getState().addConv(conversation);
            socket.emit('join-conversation', conversation._id);
        });
    },

    disconnectSocket: () => {
        const socket = get().socket;

        if (socket) {
            socket.disconnect();
            set({socket: null});
            console.log('Disconnected from socket server');
        }
    }
}))