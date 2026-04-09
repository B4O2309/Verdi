import { useFriendStore } from "@/stores/useFriendStore";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Users } from "lucide-react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import type { Friend } from "@/types/user";
import InviteSuggestionList from "../newGroupChat/InviteSuggestionList";

const NewGroupChatModal = () => {
    const [groupName, setGroupName] = useState("");
    const [search, setSearch] = useState("");
    const {friends, getFriends} = useFriendStore();
    const [invitedUsers, setInvitedUsers] = useState<Friend[]>([]);

    const handleGetFriends = async () => {
        await getFriends();
    };
    
    const filteredFriends = friends.filter((friend) => friend.displayName.toLowerCase().
    includes(search.toLowerCase()) && !invitedUsers.some((u) => u._id === friend._id));

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                variant="ghost"
                onClick={handleGetFriends}
                className="flex z-10 justify-center items-center size-5 rounded-full 
                hover:bg-sidebar-accent transition cursor-pointer"
                >
                    <Users className="size-4"/>
                    <span className="sr-only">New Group Chat</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px] border-none">
                <DialogHeader>
                    <DialogTitle className="capitalize">Create Group Chat</DialogTitle>
                </DialogHeader>

                <form 
                    className="space-y-4"
                    onSubmit={() => {}}
                >
                    {/* Group Name */}
                    <div
                        className="space-y-2"
                    >
                        <Label
                            htmlFor="groupName" 
                            className="text-sm font-semibold"
                        >
                            Group Name
                        </Label>

                        <Input
                            id="groupName"
                            placeholder="Enter group name..."
                            className="glass border-border/50 focus:border-primary/50 transition-smooth"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    {/* Invite Friend */}
                    <div
                        className="space-y-2"
                    >
                        <Label
                            htmlFor="invite" 
                            className="text-sm font-semibold"
                        >
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
                        <InviteSuggestionList/>

                        {/* List of selected users */}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default NewGroupChatModal;