import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { useState } from "react"
import { useFriendStore } from "@/stores/useFriendStore"
import type { Participant } from "@/types/chat"
import type { Friend } from "@/types/user"
import InviteSuggestionList from "../newGroupChat/InviteSuggestionList"
import SelectedUsersList from "../createNewChat/SelectedUsersList"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { UserPlus } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/axios"

interface AddGroupMembersDialogProps {
    open: boolean;
    onClose: () => void;
    conversationId: string;
    currentMembers: Participant[];
}

const AddGroupMembersDialog = ({ open, onClose, conversationId, currentMembers }: AddGroupMembersDialogProps) => {
    const { friends, getFriends } = useFriendStore();
    const [search, setSearch] = useState("");
    const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);

    const handleOpen = async (val: boolean) => {
        if (val) await getFriends();
        else {
            setSearch("");
            setSelectedFriends([]);
        }
        if (!val) onClose();
    };

    const memberIds = currentMembers.map(m => m._id);
    const friendsNotInGroup = friends.filter(f => !memberIds.includes(f._id));
    const filteredFriends = friendsNotInGroup.filter(
        f => f.displayName.toLowerCase().includes(search.toLowerCase())
            && !selectedFriends.some(s => s._id === f._id)
    );

    const handleAdd = async () => {
        if (selectedFriends.length === 0) return;
        try {
            setLoading(true);
            await api.post(`/conversations/${conversationId}/members`, {
                memberIds: selectedFriends.map(f => f._id)
            }, { withCredentials: true });
            toast.success(`Added ${selectedFriends.length} member(s) successfully!`);
            setSelectedFriends([]);
            setSearch("");
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to add members.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogContent className="sm:max-w-[400px] border-none">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Add Members
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Search Friends</Label>
                        <Input
                            placeholder="Search friends..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass border-border/50 focus:border-primary/50 transition-smooth"
                        />
                    </div>

                    {search && filteredFriends.length > 0 && (
                        <InviteSuggestionList
                            filteredFriends={filteredFriends}
                            onSelect={(f) => setSelectedFriends(prev => [...prev, f])}
                        />
                    )}

                    {search && filteredFriends.length === 0 && (
                        <p className="text-xs text-muted-foreground px-1">
                            {friendsNotInGroup.length === 0
                                ? "All your friends are already in this group."
                                : "No friends found."}
                        </p>
                    )}

                    {selectedFriends.length > 0 && (
                        <SelectedUsersList
                            invitedUsers={selectedFriends}
                            onRemove={(f) => setSelectedFriends(prev => prev.filter(s => s._id !== f._id))}
                        />
                    )}

                    <Button
                        className="w-full bg-gradient-chat text-white hover:opacity-90 transition-smooth"
                        onClick={handleAdd}
                        disabled={loading || selectedFriends.length === 0}
                    >
                        {loading ? "Adding..." : `Add ${selectedFriends.length > 0 ? `${selectedFriends.length} member(s)` : "Members"}`}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddGroupMembersDialog;