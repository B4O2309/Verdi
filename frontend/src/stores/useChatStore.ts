import { chatService } from '@/services/chatService';
import type { ChatState } from '@/types/store';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './useAuthStore';

export const useChatStore = create<ChatState>()(
    persist(
        (set,get) => ({
            conversations: [],
            messages: {},
            activeConversationId: null,
            convloading: false, //conv loading
            messageLoading: false, //message loading

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
            }
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