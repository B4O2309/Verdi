import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { UserPlus } from "lucide-react";
import type { User } from "@/types/user";
import { useFriendStore } from "@/stores/useFriendStore";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import SearchForm from "../AddFriendModal/SearchForm";
import { SendFriendRequestForm } from "../AddFriendModal/SendFriendRequestForm";

export interface IFormValues {
    username: string;
    message: string;
}

interface AddFriendModalProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultUsername?: string;
    showTrigger?: boolean;
}

const AddFriendModal = ({
    open: controlledOpen,
    onOpenChange,
    defaultUsername,
    showTrigger = true,
}: AddFriendModalProps) => {
    const isControlled = controlledOpen !== undefined;
    const [internalOpen, setInternalOpen] = useState(false);
    const open = isControlled ? controlledOpen : internalOpen;

    const [isFound, setIsFound] = useState<boolean | null>(null);
    const [searchUser, setSearchUser] = useState<User>();
    const [searchedUsername, setSearchedUsername] = useState("");
    const { loading, searchbyUsername, addFriend } = useFriendStore();

    const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<IFormValues>({
        defaultValues: { username: "", message: "" }
    });

    const usernameValue = watch("username");

    useEffect(() => {
        if (open && defaultUsername) {
            setValue("username", defaultUsername);
            setSearchedUsername(defaultUsername);

            const autoSearch = async () => {
                const foundUser = await searchbyUsername(defaultUsername);
                if (foundUser) {
                    setIsFound(true);
                    setSearchUser(foundUser);
                } else {
                    setIsFound(false);
                }
            };

            autoSearch();
        }
    }, [open, defaultUsername]);

    const handleOpenChange = (val: boolean) => {
        if (isControlled) {
            onOpenChange?.(val);
        } else {
            setInternalOpen(val);
        }
        if (!val) handleCancel();
    };

    const handleSearch = handleSubmit(async (data) => {
        const username = data.username.trim();
        if (!username) return;

        setIsFound(null);
        setSearchedUsername(username);

        try {
            const foundUser = await searchbyUsername(username);
            if (foundUser) {
                setIsFound(true);
                setSearchUser(foundUser);
            } else {
                setIsFound(false);
            }
        }
        catch (error) {
            console.error("Error searching user:", error);
            setIsFound(false);
        }
    });

    const handleSend = handleSubmit(async (data) => {
        if (!searchUser) return;

        try {
            const message = await addFriend(searchUser._id, data.message.trim());

            if (
                message?.toLowerCase().includes("already") ||
                message?.toLowerCase().includes("failed")
            ) {
                toast.error(message);
            } else {
                toast.success(message);
                handleOpenChange(false);
            }
        }
        catch (error) {
            console.error("Error sending friend request:", error);
        }
    });

    const handleCancel = () => {
        reset();
        setSearchedUsername("");
        setIsFound(null);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {showTrigger && (
                <DialogTrigger asChild>
                    <div
                        className="flex justify-center items-center size-5 rounded-full 
                        hover:bg-sidebar-accent cursor-pointer z-10"
                        onClick={() => setInternalOpen(true)}
                    >
                        <UserPlus className="size-4" />
                        <span className="sr-only">Add Friend</span>
                    </div>
                </DialogTrigger>
            )}

            <DialogContent className="sm:max-w-[425px] border-none">
                <DialogHeader>
                    <DialogTitle>Add Friend</DialogTitle>
                </DialogHeader>

                {!isFound && (
                    <SearchForm
                        register={register}
                        errors={errors}
                        usernameValue={usernameValue}
                        loading={loading}
                        isFound={isFound}
                        searchedUsername={searchedUsername}
                        onSubmit={handleSearch}
                        onCancel={() => handleOpenChange(false)}
                    />
                )}

                {isFound && (
                    <SendFriendRequestForm
                        register={register}
                        loading={loading}
                        searchedUsername={searchedUsername}
                        onSubmit={handleSend}
                        onBack={() => setIsFound(null)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AddFriendModal;