import type { Conversation } from "@/types/chat";
import ChatCard from "./ChatCard";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import UnreadCountBadge from "./UnreadCountBadge";
import GroupChatAvatar from "./GroupChatAvatar";

const GroupChatCard = ({ conv }: { conv: Conversation }) => {
    const { user } = useAuthStore();
    const { activeConversationId, setActiveConversation, messages, fetchMessages } = useChatStore();

    if (!user) return null;

    const unreadCount = conv.unreadCounts?.[user._id] ?? 0;
    const name = conv.group?.name ?? "";

    const handleSelectConversation = async (id: string) => {
        setActiveConversation(id);
        if (!messages[id]) {
            await fetchMessages();
        }
    };

    return (
        <ChatCard
            convId={conv._id}
            name={name}
            timestamp={
                conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt) : undefined
            }
            isActive={activeConversationId === conv._id}
            onSelect={handleSelectConversation}
            unreadCount={unreadCount}
            leftSection={
                <>
                    {unreadCount > 0 && <UnreadCountBadge unreadCount={unreadCount} />}
                    <GroupChatAvatar 
                        participants={conv.participants}
                        type="chat"
                    />
                </>
            }
            subtitle={
                <p className="text-sm truncate text-muted-foreground">
                    {conv.participants.length} members
                </p>
            }
        />
    );
};

export default GroupChatCard;