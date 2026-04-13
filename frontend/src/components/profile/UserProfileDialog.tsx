import { Dialog, DialogContent } from "../ui/dialog"
import { useEffect, useState } from "react"
import { authService } from "@/services/authService"
import UserAvatar from "../chat/UserAvatar"
import { useSocketStore } from "@/stores/useSocketStore"
import { useAuthStore } from "@/stores/useAuthStore"
import { useFriendStore } from "@/stores/useFriendStore"
import { Loader2, UserPlus, UserCheck, Ban } from "lucide-react"
import AddFriendModal from "../chat/AddFriendModal"
import StatusBadge from "../chat/StatusBadge"
import { useBlockStore } from "@/stores/useBlockStore";
import { cn } from "@/lib/utils"

interface UserProfileDialogProps {
    userId: string | null;
    onClose: () => void;
}

interface PublicUser {
    _id: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
    bio?: string;
}

const UserProfileDialog = ({ userId, onClose }: UserProfileDialogProps) => {
    const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [openAddFriend, setOpenAddFriend] = useState(false);
    const { onlineUsers } = useSocketStore();
    const { user } = useAuthStore();
    const { friends, getFriends } = useFriendStore();
    const { isBlocked, blockUser, unblockUser, loading: blockLoading } = useBlockStore();

    const [blockStatus, setBlockStatus] = useState({ iBlockedThem: false, theyBlockedMe: false });

    useEffect(() => {
        if (!userId) return;
        const fetch = async () => {
            try {
                setLoading(true);
                const [u, status] = await Promise.all([
                    authService.getUserById(userId),
                    useBlockStore.getState().getBlockStatus(userId)
                ]);
                setProfileUser(u);
                setBlockStatus(status);
            } catch {
                setProfileUser(null);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [userId]);

    const isOnline = profileUser ? onlineUsers.includes(profileUser._id) : false;
    const isMe = profileUser?._id === user?._id;
    const isFriend = friends.some(f => f._id === profileUser?._id);

    return (
        <>
            <Dialog open={!!userId} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[360px] border-none p-0 overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                    <div className="px-6 pb-6">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : profileUser ? (
                            <>
                                <div className="flex items-end justify-between -mt-10 mb-3">
                                    {/* Avatar + dot status */}
                                    <div className="relative">
                                        <UserAvatar
                                            type="profile"
                                            name={profileUser.displayName}
                                            avatarUrl={profileUser.avatarUrl}
                                            className="ring-4 ring-background shadow-lg"
                                        />
                                        <StatusBadge status={isOnline ? "online" : "offline"} size="md" />
                                    </div>

                                    {/* Friend status button */}
                                    {!isMe && (
                                        isFriend ? (
                                            // If already friend → show "Friends" with check icon, no click action
                                            <div className="flex items-center gap-1.5 text-xs font-medium
                                                text-emerald-600 border border-emerald-300 rounded-full px-3 py-1.5 mb-1">
                                                <UserCheck className="size-3.5" />
                                                Friends
                                            </div>
                                        ) : profileUser.username ? (
                                            // If not friend but has username → show button Add Friend
                                            <button
                                                type="button"
                                                onClick={() => setOpenAddFriend(true)}
                                                className="flex items-center gap-1.5 text-xs font-medium
                                                text-primary hover:opacity-80 transition mb-1
                                                border border-primary/30 rounded-full px-3 py-1.5"
                                            >
                                                <UserPlus className="size-3.5" />
                                                Add Friend
                                            </button>
                                        ) : null
                                    )}
                                    {!isMe && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (blockStatus.iBlockedThem) {
                                                    await unblockUser(profileUser!._id);
                                                    setBlockStatus(prev => ({ ...prev, iBlockedThem: false }));
                                                } else {
                                                    await blockUser(profileUser!._id);
                                                    setBlockStatus(prev => ({ ...prev, iBlockedThem: true }));
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center gap-1.5 text-xs font-medium transition-all duration-200 mb-1 rounded-full px-3 py-1.5 border",
                                                blockStatus.iBlockedThem
                                                    ? "bg-destructive/10 text-destructive border-destructive/40 hover:bg-destructive hover:text-white"
                                                    : "bg-transparent text-muted-foreground border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40"
                                            )}
                                        >
                                            <Ban className="size-3.5" />
                                            {blockStatus.iBlockedThem ? "Unblock" : "Block"}
                                        </button>
                                    )}
                                </div>

                                <h2 className="text-lg font-semibold">{profileUser.displayName}</h2>

                                {profileUser.username && (
                                    <p className="text-sm text-muted-foreground mb-2">
                                        @{profileUser.username}
                                    </p>
                                )}

                                {profileUser.bio ? (
                                    <p className="text-sm text-foreground/80 mt-2 border-t border-border/30 pt-3">
                                        {profileUser.bio}
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground mt-2 border-t border-border/30 pt-3 italic">
                                        No bio yet.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                User not found.
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {profileUser?.username && (
                <AddFriendModal
                    open={openAddFriend}
                    onOpenChange={setOpenAddFriend}
                    defaultUsername={profileUser.username}
                    showTrigger={false}
                />
            )}
        </>
    );
};

export default UserProfileDialog;