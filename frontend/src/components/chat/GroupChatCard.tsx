import type { Conversation } from "@/types/chat";
import ChatCard from "./ChatCard";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import UnreadCountBadge from "./UnreadCountBadge";
import GroupChatAvatar from "./GroupChatAvatar";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

const GroupChatCard = ({ conv }: { conv: Conversation }) => {
    const { user } = useAuthStore();
    const {
        activeConversationId, setActiveConversation,
        messages, fetchMessages,
        hideConversation, deleteConversation,
        renameGroup, leaveGroup
    } = useChatStore();

    const [openRename, setOpenRename] = useState(false);
    const [newName, setNewName] = useState(conv.group?.name ?? "");
    const [renameLoading, setRenameLoading] = useState(false);

    if (!user) return null;

    const unreadCount = conv.unreadCounts?.[user._id] ?? 0;
    const name = conv.group?.name ?? "";

    const handleSelectConversation = async (id: string) => {
        setActiveConversation(id);
        if (!messages[id]) await fetchMessages();
    };

    const handleRename = async () => {
        if (!newName.trim() || newName.trim() === conv.group?.name) {
            setOpenRename(false);
            return;
        }
        try {
            setRenameLoading(true);
            await renameGroup(conv._id, newName.trim());
            setOpenRename(false);
        } finally {
            setRenameLoading(false);
        }
    };

    return (
        <>
            <ChatCard
                convId={conv._id}
                name={name}
                timestamp={
                    conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt) : undefined
                }
                isActive={activeConversationId === conv._id}
                onSelect={handleSelectConversation}
                unreadCount={unreadCount}
                onHide={() => hideConversation(conv._id)}
                onDelete={() => deleteConversation(conv._id)}
                onRename={() => {
                    setNewName(conv.group?.name ?? "");
                    setOpenRename(true);
                }}
                onLeave={() => leaveGroup(conv._id)}
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

            <Dialog open={openRename} onOpenChange={setOpenRename}>
                <DialogContent className="sm:max-w-[360px] border-none">
                    <DialogHeader>
                        <DialogTitle>Rename Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="group-name">Group Name</Label>
                            <Input
                                id="group-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                                placeholder="Enter new group name..."
                                className="glass-light border-border/30"
                            />
                        </div>
                        <Button
                            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                            onClick={handleRename}
                            disabled={renameLoading || !newName.trim()}
                        >
                            {renameLoading ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default GroupChatCard;