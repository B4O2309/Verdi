import { chatService } from '@/services/chatService';
import type { ChatState } from '@/types/store';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';
import { useSocketStore } from './useSocketStore';
import { toast } from 'sonner';
import api from '@/lib/axios';

export const useChatStore = create<ChatState>()(
    persist(
        (set,get) => ({
            conversations: [],
            messages: {},
            activeConversationId: null,
            convloading: false, //conv loading
            messageLoading: false, //message loading
            loading: false, //general loading for actions like creating conversation or sending message

            setActiveConversation: (id) => set({activeConversationId: id}),
            reset: () => {
                set({
                    conversations: [],
                    messages: {},
                    activeConversationId: null,
                    convloading: false,
                    messageLoading: false
                });
            },
            fetchConversations: async () => {
                try {
                    set({convloading: true});
                    const {conversations} = await chatService.fetchConversations();
                    set({conversations, convloading: false});
                }
                catch (error) {
                    console.error("Failed to fetch conversations", error);
                    set({ convloading: false });
                }
            },

            fetchMessages: async (conversationId) => {
                const {activeConversationId, messages} = get();
                const {user} = useAuthStore.getState();

                const convId = conversationId ?? activeConversationId;

                if (!convId) return;

                const current = messages?.[convId];
                const nextCursor = current?.nextCursor === undefined ? "" : current?.nextCursor;

                if(nextCursor === null) return;


                set({messageLoading: true});

                try {
                    const {messages: fetched, cursor} =  await chatService.fetchMessages(convId, nextCursor);

                    const processed = fetched.map(m => ({
                        ...m,
                        isOwn: m.senderId === user?._id
                    }));

                    set((state) => {
                        const prev = state.messages[convId]?.items ?? [];
                        const merged = prev.length > 0 ? [...processed, ...prev] : processed;

                        return {
                            messages: {
                                ...state.messages,
                                [convId]: {
                                    items: merged,
                                    nextCursor: cursor ?? null,
                                    hasMore: !!cursor
                            },
                        }
                    }
                });

                }
                catch (error) {
                    console.error("Failed to fetch messages", error);
                }
                finally {
                    set({messageLoading: false});
                }
            },

            sendDirectMessage: async (recipientId, content, imgUrl) => {
                try {
                    const {activeConversationId} = get();
                    await chatService.sendDirectMessage(recipientId, content, imgUrl, activeConversationId || undefined);
                    
                    set((state) => ({
                        conversations:state.conversations.map((c) => 
                            c._id === activeConversationId ? {...c, seenBy: []} : c)
                    }));

                } catch (error) {
                    console.error("Failed to send direct message", error);
                }
            },

            sendGroupMessage: async (conversationId, content, imgUrl) => {
                try {
                    await chatService.sendGroupMessage(conversationId, content, imgUrl);
                    set((state) => ({
                        conversations:state.conversations.map((c) => 
                            c._id === get(). activeConversationId ? {...c, seenBy: []} : c)
                    }));
                } catch (error) {
                    console.error("Failed to send group message", error);
                }
            },

            addMessage: async (message) => {
                try {
                    const { user } = useAuthStore.getState();
                    const { activeConversationId } = get();

                    message.isOwn = message.senderId === user?._id;
                    const convId = message.conversationId;

                    if (activeConversationId === convId) {
                        const prevItems = get().messages[convId]?.items ?? [];
                        if (prevItems.length === 0) {
                            await get().fetchMessages(convId);
                        }
                    }

                    set((state) => {
                        const prevItems = state.messages[convId]?.items ?? [];

                        if (prevItems.some(m => m._id === message._id)) {
                            return state; // no duplicates
                        }

                        return {
                            messages: {
                                ...state.messages,
                                [convId]: {
                                    items: [...prevItems, message],
                                    hasMore: state.messages[convId]?.hasMore ?? false,
                                    nextCursor: state.messages[convId]?.nextCursor ?? null
                                }
                            }
                        };
                    });
                }
                catch (error) {
                    console.error("Failed to add message", error);
                }
            },
            
            updateConversation: (conversation) => {
                set((state) => ({
                    conversations: state.conversations.map((c) =>
                        c._id === conversation._id
                            ? { ...c, ...conversation }
                            : c
                    )
                }));
            },
            
            markAsSeen: async () => {
                try {
                    const {user} = useAuthStore.getState();
                    const {activeConversationId, conversations} = get();

                    if(!activeConversationId || !user) return;

                    const conv = conversations.find((c) => c._id === activeConversationId);

                    if (!conv) return;

                    if ((conv.unreadCounts?.[user._id] ?? 0) === 0) return;

                    await chatService.markAsSeen(activeConversationId);

                    set((state) => ({
                        conversations: state.conversations.map((c) => 
                            c._id === activeConversationId && c.lastMessage ? {
                                ...c,
                                unreadCounts: {
                                    ...c.unreadCounts,
                                    [user._id]: 0
                                }
                            }
                            : c)
                    }));
                }
                catch (error) {
                    console.error("Failed to mark as seen", error);
                }
            },

            addConv: (conv, setActive = false) => {
                if (!conv?._id) return;
                set((state) => {
                    const exists = state.conversations.some((c) => c._id.toString() === conv._id.toString());
                    return {
                        conversations: exists ? state.conversations : [conv, ...state.conversations],
                        ...(setActive ? { activeConversationId: conv._id } : {})
                    };
                });
            },
            
            createConversation: async (type, name, memberIds) => {
                try {
                    set({ loading: true });
                    const conversation = await chatService.createConversation(type, name, memberIds);
                    get().addConv(conversation, true);
                    useSocketStore.getState().socket?.emit('join-conversation', conversation._id);
                }
                catch (error) {
                    console.error("Failed to create conversation", error);
                }
                finally {
                    set({ loading: false });
                }
            },

            hideConversation: async (conversationId: string) => {
                try {
                    await api.put(`/conversations/${conversationId}/hide`, {}, { withCredentials: true });
                    // Delete locally to reflect immediately
                    set((state) => ({
                        conversations: state.conversations.filter((c) => c._id !== conversationId),
                        activeConversationId: state.activeConversationId === conversationId
                            ? null
                            : state.activeConversationId
                    }));
                } catch (error) {
                    console.error(error);
                    toast.error('Failed to hide conversation.');
                }
            },

            deleteConversation: async (conversationId: string) => {
                try {
                    await api.delete(`/conversations/${conversationId}/delete`, { withCredentials: true });
                    set((state) => ({
                        conversations: state.conversations.filter((c) => c._id !== conversationId),
                        activeConversationId: state.activeConversationId === conversationId
                            ? null
                            : state.activeConversationId,
                        messages: Object.fromEntries(
                            Object.entries(state.messages).filter(([key]) => key !== conversationId)
                        )
                    }));
                } catch (error) {
                    console.error(error);
                    toast.error('Failed to delete conversation.');
                }
            },

            renameGroup: async (conversationId: string, name: string) => {
                try {
                    const res = await api.patch(`/conversations/${conversationId}/rename`, { name }, { withCredentials: true });
                } catch (error) {
                    console.error(error);
                    toast.error('Failed to rename group.');
                }
            },

            leaveGroup: async (conversationId: string) => {
                try {
                    await api.delete(`/conversations/${conversationId}/leave`, { withCredentials: true });
                    set((state) => ({
                        conversations: state.conversations.filter((c) => c._id !== conversationId),
                        activeConversationId: state.activeConversationId === conversationId
                            ? null
                            : state.activeConversationId,
                        messages: Object.fromEntries(
                            Object.entries(state.messages).filter(([key]) => key !== conversationId)
                        )
                    }));
                    toast.success('Left group successfully.');
                } catch (error) {
                    console.error(error);
                    toast.error('Failed to leave group.');
                }
            },
        }),
        {
            name: 'chat-storage',
            partialize: (state) => ({conversations: state.conversations}),
            merge: (persistedState: any, currentState) => ({
                ...currentState,
                ...persistedState,
                conversations: Array.isArray(persistedState?.conversations)
                    ? persistedState.conversations
                    : [],
            }),
        }
    )
);