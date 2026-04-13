import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import type { Participant } from "@/types/chat"
import UserAvatar from "../chat/UserAvatar"
import StatusBadge from "../chat/StatusBadge"
import { useSocketStore } from "@/stores/useSocketStore"
import { useAuthStore } from "@/stores/useAuthStore"
import { useFriendStore } from "@/stores/useFriendStore"
import { useEffect, useState } from "react"
import UserProfileDialog from "./UserProfileDialog"
import AddFriendModal from "../chat/AddFriendModal"
import { Users, Info, UserPlus, UserCheck } from "lucide-react"

interface GroupMembersDialogProps {
    open: boolean;
    onClose: () => void;
    members: Participant[];
    groupName: string;
    conversationId: string;
}

const GroupMembersDialog = ({ open, onClose, members, groupName }: GroupMembersDialogProps) => {
    const { onlineUsers } = useSocketStore();
    const { user } = useAuthStore();
    const { friends, getFriends } = useFriendStore();
    const [viewingUserId, setViewingUserId] = useState<string | null>(null);
    const [addFriendUsername, setAddFriendUsername] = useState<string | null>(null);

    useEffect(() => {
        if (open) getFriends();
    }, [open]);

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[380px] border-none">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {groupName} · {members.length} members
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 beautiful-scrollbar">
                        {members.map((member) => {
                            const isOnline = onlineUsers.includes(member._id);
                            const isMe = member._id === user?._id;
                            const isFriend = friends.some(f => f._id === member._id);

                            return (
                                <div
                                    key={member._id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition group"
                                >
                                    <div className="relative shrink-0">
                                        <UserAvatar
                                            type="sidebar"
                                            name={member.displayName}
                                            avatarUrl={member.avatarUrl ?? undefined}
                                        />
                                        <StatusBadge status={isOnline ? "online" : "offline"} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {member.displayName}
                                            {isMe && (
                                                <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {isOnline ? "Online" : "Offline"}
                                        </p>
                                    </div>

                                    {!isMe && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                            {isFriend ? (
                                                <div
                                                    className="p-1.5 rounded-full text-emerald-500"
                                                    title="Already friends"
                                                >
                                                    <UserCheck className="size-4" />
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setAddFriendUsername(member.username ?? null)}
                                                    className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition"
                                                    title="Add Friend"
                                                >
                                                    <UserPlus className="size-4" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setViewingUserId(member._id)}
                                                className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition"
                                                title="View Profile"
                                            >
                                                <Info className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            <UserProfileDialog
                userId={viewingUserId}
                onClose={() => setViewingUserId(null)}
            />

            {addFriendUsername && (
                <AddFriendModal
                    open={!!addFriendUsername}
                    onOpenChange={(val) => { if (!val) setAddFriendUsername(null); }}
                    defaultUsername={addFriendUsername}
                    showTrigger={false}
                />
            )}
        </>
    );
};

export default GroupMembersDialog;