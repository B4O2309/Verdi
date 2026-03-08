import type { Conversation } from "@/types/chat";
import ChatCard from "./ChatCard";
import { cn } from "@/lib/utils";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import UnreadCountBadge from "./UnreadCountBadge";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";

const DirectMessageCard = ({ conv }: { conv: Conversation }) => {
    const { user } = useAuthStore();
    const { activeConversationId, setActiveConversation, messages, fetchMessages } = useChatStore();

    if (!user) return null;

    const otherUser = conv.participants.find((p) => p._id !== user._id);
    if (!otherUser) return null;

    const unreadCount = conv.unreadCounts?.[user._id] ?? 0;
    const lastMessage = conv.lastMessage?.content ?? "";

    const handleSelectConversation = async (id: string) => {
        setActiveConversation(id);
        if (!messages[id]) {
            await fetchMessages();
        }
    };

    return (
        <ChatCard
            convId={conv._id}
            name={otherUser.displayName ?? ""}
            timestamp={
                conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt) : undefined
            }
            isActive={activeConversationId === conv._id}
            onSelect={handleSelectConversation}
            unreadCount={unreadCount}
            leftSection={
                <>
                    <UserAvatar
                        type="sidebar"
                        name={otherUser.displayName ?? ""}
                        avatarUrl={otherUser.avatarUrl ?? undefined}
                    />
                    {/* Socket.io */}
                    <StatusBadge status="offline" />
                    {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
                </>
            }
            subtitle={
                <p className={cn(
                    "text-sm truncate",
                    unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                    {lastMessage}
                </p>
            }
        />
    );
};

export default DirectMessageCard;