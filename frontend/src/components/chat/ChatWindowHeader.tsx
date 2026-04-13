import { useChatStore } from "@/stores/useChatStore";
import { SidebarTrigger } from "../ui/sidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Separator } from "../ui/separator";
import UserAvatar from "./UserAvatar";
import StatusBadge from "./StatusBadge";
import GroupChatAvatar from "./GroupChatAvatar";
import type { Conversation } from "@/types/chat";
import { useSocketStore } from "@/stores/useSocketStore";
import { Info, Users, UserPlus } from "lucide-react";
import { useState } from "react";
import UserProfileDialog from "../profile/UserProfileDialog";
import GroupMembersDialog from "../profile/GroupMembersDialog";
import AddGroupMembersDialog from "../profile/AddGroupMembersDialog";

const ChatWindowHeader = ({ chat }: { chat?: Conversation }) => {
    const { conversations, activeConversationId } = useChatStore();
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();
    const [viewingUserId, setViewingUserId] = useState<string | null>(null);
    const [openMembers, setOpenMembers] = useState(false);
    const [openAddMembers, setOpenAddMembers] = useState(false);

    chat = chat ?? conversations.find((c) => c._id === activeConversationId);
    let otherUser;

    if (!chat)
        return (
            <header className="md:hidden sticky top-0 z-10 flex items-center gap-2 px-4 py-2 w-full">
                <SidebarTrigger className="-ml-1 text-foreground" />
            </header>
        );

    if (chat.type === "direct") {
        const otherUsers = chat.participants.filter((p) => p._id !== user?._id);
        otherUser = otherUsers.length > 0 ? otherUsers[0] : null;
        if (!user || !otherUser) return;
    }

    return (
        <>
            <header className="sticky top-0 z-10 px-4 py-2 flex items-center bg-background">
                <div className="flex items-center gap-2 w-full">
                    <SidebarTrigger className="-ml-1 text-foreground" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />

                    <div className="p-2 w-full flex items-center gap-3">
                        <div className="relative">
                            {chat.type === "direct" ? (
                                <>
                                    <UserAvatar
                                        type="sidebar"
                                        name={otherUser?.displayName || "Verdi User"}
                                        avatarUrl={otherUser?.avatarUrl || undefined}
                                    />
                                    <StatusBadge status={onlineUsers.includes(otherUser?._id ?? "") ? "online" : "offline"} />
                                </>
                            ) : (
                                <GroupChatAvatar participants={chat.participants} type="sidebar" />
                            )}
                        </div>

                        <h2 className="font-semibold text-foreground flex-1">
                            {chat.type === "direct" ? otherUser?.displayName : chat.group?.name}
                        </h2>

                        {/* Direct: view profile */}
                        {chat.type === "direct" && otherUser && (
                            <button
                                type="button"
                                onClick={() => setViewingUserId(otherUser!._id)}
                                className="p-1.5 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                title="View profile"
                            >
                                <Info className="h-4 w-4" />
                            </button>
                        )}

                        {/* Group: add member + view members */}
                        {chat.type === "group" && (
                            <div className="flex items-center gap-1">
                                {/* Add member */}
                                <button
                                    type="button"
                                    onClick={() => setOpenAddMembers(true)}
                                    className="p-1.5 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                    title="Add members"
                                >
                                    <UserPlus className="h-4 w-4" />
                                </button>

                                {/* View members */}
                                <button
                                    type="button"
                                    onClick={() => setOpenMembers(true)}
                                    className="p-1.5 rounded-full hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                    title="View members"
                                >
                                    <Users className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <UserProfileDialog
                userId={viewingUserId}
                onClose={() => setViewingUserId(null)}
            />

            {chat.type === "group" && (
                <>
                    <GroupMembersDialog
                        open={openMembers}
                        onClose={() => setOpenMembers(false)}
                        members={chat.participants}
                        groupName={chat.group?.name ?? "Group"}
                        conversationId={chat._id}
                    />

                    {/* Add Members Dialog */}
                    <AddGroupMembersDialog
                        open={openAddMembers}
                        onClose={() => setOpenAddMembers(false)}
                        conversationId={chat._id}
                        currentMembers={chat.participants}
                    />
                </>
            )}
        </>
    );
};

export default ChatWindowHeader;