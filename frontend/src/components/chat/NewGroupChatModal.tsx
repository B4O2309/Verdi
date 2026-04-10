import { useFriendStore } from "@/stores/useFriendStore";
import { createContext, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { UserPlus, Users } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import type { Friend } from "@/types/user";
import InviteSuggestionList from "../newGroupChat/InviteSuggestionList";
import SelectedUsersList from "../createNewChat/SelectedUsersList";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";

const NewGroupChatModal = () => {
    const [groupName, setGroupName] = useState("");
    const [search, setSearch] = useState("");
    const { friends, getFriends } = useFriendStore();
    const [invitedUsers, setInvitedUsers] = useState<Friend[]>([]);
    const { loading, createConversation } = useChatStore();

    const handleGetFriends = async () => {
        await getFriends();
    };

    const filteredFriends = friends.filter(
        (friend) =>
            friend.displayName.toLowerCase().includes(search.toLowerCase()) &&
            !invitedUsers.some((u) => u._id === friend._id)
    );

    const handleSelectFriend = (friend: Friend) => {
        setInvitedUsers((prev) => [...prev, friend]);
    };

    const handleRemoveFriend = (friend: Friend) => {
        setInvitedUsers(invitedUsers.filter((u) => u._id !== friend._id));
    }

    const handleSubmit = async (e: React.FormEvent) => {
        try {
            e.preventDefault();
            if (invitedUsers.length === 0) {
                toast.warning("Please invite at least one friend to create a group chat.");
                return;
            }

            await createConversation(
                "group",
                groupName,
                invitedUsers.map((u) => u._id)
            );

            setSearch("");
            setInvitedUsers([]);
            setGroupName("");
        }
        catch (error) {
            console.error("Failed to create group chat:", error);
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    onClick={handleGetFriends}
                    className="flex z-10 justify-center items-center size-5 rounded-full 
                    hover:bg-sidebar-accent transition cursor-pointer"
                >
                    <Users className="size-4" />
                    <span className="sr-only">New Group Chat</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] border-none">
                <DialogHeader>
                    <DialogTitle className="capitalize">Create Group Chat</DialogTitle>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    {/* Group Name */}
                    <div className="space-y-2">
                        <Label htmlFor="groupName" className="text-sm font-semibold">
                            Group Name
                        </Label>
                        <Input
                            id="groupName"
                            placeholder="Enter group name..."
                            className="glass border-border/50 focus:border-primary/50 transition-smooth"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Invite Friend */}
                    <div className="space-y-2">
                        <Label htmlFor="invite" className="text-sm font-semibold">
                            Invite Friends
                        </Label>
                        <Input
                            id="invite"
                            placeholder="Search friends..."
                            className="glass border-border/50 focus:border-primary/50 transition-smooth"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        {/* Suggested Friends */}
                        {search && filteredFriends.length > 0 && (
                            <InviteSuggestionList
                                filteredFriends={filteredFriends}
                                onSelect={handleSelectFriend}
                            />
                        )}

                        {/* List of selected users */}
                        <SelectedUsersList
                            invitedUsers={invitedUsers}
                            onRemove={handleRemoveFriend}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-chat text-white hover:opacity-90
                            transition-smooth"
                        >
                            {loading ? (
                                <span>Creating...</span>
                            ) : (
                                <>
                                    <UserPlus className="size-4 mr-2"/>
                                    Create Group
                                </>
                            )
                        }
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default NewGroupChatModal;