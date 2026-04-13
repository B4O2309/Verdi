import type { Friend, FriendRequest, User } from './user';
import type { Conversation, Message } from './chat';
import type { Socket } from 'node_modules/socket.io-client/build/esm/socket';

export interface AuthState {
    accessToken: string | null;
    user: User | null;
    loading: boolean;

    setAccessToken: (accessToken: string) => void;
    setUser: (user: User) => void;
    clearState: () => void;

    signUp: (username: string, password: string, firstname: string, lastname: string, email: string) => Promise<void>;
    signIn: (username: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    fetchMe: () => Promise<void>;
    refresh: () => Promise<void>;
    updateProfile: (data: { displayName?: string; username?: string; email?: string; phone?: string; bio?: string }) => Promise<void>;
}

export interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (dark: boolean) => void;
}

export interface ChatState {
    conversations: Conversation[];
    messages: Record<string, {
        items: Message[],
        hasMore: boolean,
        nextCursor?: string | null
    }>;
    activeConversationId: string | null;
    convloading: boolean;
    messageLoading: boolean;
    loading: boolean;
    reset: () => void;

    setActiveConversation: (id: string | null) => void;
    fetchConversations: () => Promise<void>;
    fetchMessages: (conversationId?: string) => Promise<void>;
    sendDirectMessage: (recipientId: string, content: string, imgUrl?: string) => Promise<void>;
    sendGroupMessage: (conversationId: string, content: string, imgUrl?: string) => Promise<void>;
    // Add Message
    addMessage: (message: Message) => Promise<void>;

    // Update Conversation
    updateConversation: (conversation: any) => void;
    markAsSeen: () => Promise<void>;
    addConv: (conv: Conversation, setActive?: boolean) => void;
    createConversation: (type: 'direct' | 'group', name: string, memberIds: string[]) => Promise<void>;
    hideConversation: (conversationId: string) => Promise<void>;
    deleteConversation: (conversationId: string) => Promise<void>;
    renameGroup: (conversationId: string, name: string) => Promise<void>;
    leaveGroup: (conversationId: string) => Promise<void>;
}

export interface SocketState {
    socket: Socket | null;
    onlineUsers: string[];
    connectSocket: () => void;
    disconnectSocket: () => void;
}

export interface FriendState {
    friends: Friend[];
    loading: boolean;
    receivedList: FriendRequest[];
    sentList: FriendRequest[];
    searchbyUsername: (username: string) => Promise<User | null>;
    addFriend: (to: string, message?: string) => Promise<string>;
    getAllFriendRequests: () => Promise<void>;
    acceptRequest: (requestId: string) => Promise<void>;
    declineRequest: (requestId: string) => Promise<void>;
    getFriends: () => Promise<void>;
}

export interface UserState {
    updatedAvatarUrl: (formData: FormData) => Promise<void>;
}

export interface BlockState {
    blockedUsers: BlockedUser[];
    _blockedByUsers: string[];
    loading: boolean;
    fetchBlockedUsers: () => Promise<void>;
    blockUser: (userId: string) => Promise<void>;
    unblockUser: (userId: string) => Promise<void>;
    getBlockStatus: (userId: string) => Promise<{ iBlockedThem: boolean; theyBlockedMe: boolean }>;
    isBlocked: (userId: string) => boolean;
    isBlockedBy: (userId: string) => boolean;
    addBlock: (blockerId: string, blockedId: string, currentUserId: string) => void;
    removeBlock: (blockerId: string, blockedId: string, currentUserId: string) => void;
}

export interface BlockedUser {
    _id: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
}