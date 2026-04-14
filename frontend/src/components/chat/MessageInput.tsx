import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useChatStore } from "@/stores/useChatStore";
import { useBlockStore } from "@/stores/useBlockStore";
import { useFriendStore } from "@/stores/useFriendStore";
import { useSocketStore, useTypingStore } from "@/stores/useSocketStore";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { ImagePlus, X, Send, Ban, UserX, Reply } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";
import api from "@/lib/axios";
import { authService } from "@/services/authService";

const MessageInput = ({ selectedConv }: { selectedConv: Conversation }) => {
    const { user } = useAuthStore();
    const { sendDirectMessage, sendGroupMessage, replyingTo, setReplyingTo } = useChatStore();
    const { isBlocked, isBlockedBy } = useBlockStore();
    const { friends } = useFriendStore();
    const { socket } = useSocketStore();
    const { typingUsers } = useTypingStore();
    const [value, setValue] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [otherUserExists, setOtherUserExists] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const otherUserId = selectedConv.type === "direct"
        ? selectedConv.participants.find(p => p._id !== user?._id)?._id
        : null;

    useEffect(() => {
        if (!uploading) inputRef.current?.focus();
    }, [uploading]);

    useEffect(() => {
        if (!otherUserId) return;
        const check = async () => {
            try {
                const u = await authService.getUserById(otherUserId);
                setOtherUserExists(!!u);
            } catch {
                setOtherUserExists(false);
            }
        };
        check();
    }, [otherUserId]);

    if (!user) return null;

    const otherUser = selectedConv.participants.find(p => p._id !== user._id) ?? null;
    const iBlockedThem = otherUser ? isBlocked(otherUser._id) : false;
    const theyBlockedMe = otherUser ? isBlockedBy(otherUser._id) : false;
    const isBlockedSituation = iBlockedThem || theyBlockedMe;
    const isFriend = otherUser ? friends.some(f => f._id === otherUser._id) : true;

    // Typing users in the current conversation (excluding self)
    const currentTyping = (typingUsers[selectedConv._id] ?? [])
        .filter(u => u.userId !== user._id);

    // Emit typing start/stop
    const emitTypingStart = useCallback(() => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            socket?.emit("typing-start", { conversationId: selectedConv._id });
        }

        // Reset timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            isTypingRef.current = false;
            socket?.emit("typing-stop", { conversationId: selectedConv._id });
        }, 2000);
    }, [socket, selectedConv._id]);

    const emitTypingStop = useCallback(() => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (isTypingRef.current) {
            isTypingRef.current = false;
            socket?.emit("typing-stop", { conversationId: selectedConv._id });
        }
    }, [socket, selectedConv._id]);

    if (selectedConv.type === "direct" && isBlockedSituation) {
        return (
            <div className="flex items-center justify-center gap-2 p-4 bg-background border-t border-border/30">
                <Ban className="size-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    {iBlockedThem ? "You have blocked this user. Unblock to send messages." : "You can't reply to this conversation."}
                </p>
            </div>
        );
    }

    if (selectedConv.type === "direct" && !isFriend) {
        return (
            <div className="flex items-center justify-center gap-2 p-4 bg-background border-t border-border/30">
                <UserX className="size-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    {!otherUserExists
                        ? "This account no longer exists."
                        : "You are no longer friends. Add friend again to continue chatting."
                    }
                </p>
            </div>
        );
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB."); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        e.target.value = "";
        inputRef.current?.focus();
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setImageFile(null);
        inputRef.current?.focus();
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile) return null;
        const formData = new FormData();
        formData.append("file", imageFile);
        const res = await api.post("/messages/upload-image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
        });
        return res.data.imgUrl;
    };

    const sendMessage = async () => {
        if (!value.trim() && !imageFile) return;
        const currValue = value;
        const replyTo = replyingTo?._id;
        setReplyingTo(null);
        setValue("");
        emitTypingStop();

        try {
            setUploading(true);
            const imgUrl = await uploadImage();
            handleRemoveImage();
            if (selectedConv.type === "direct") {
                if (!otherUser) return;
                await sendDirectMessage(otherUser._id, currValue, imgUrl ?? undefined, replyTo);
            } else {
                await sendGroupMessage(selectedConv._id, currValue, imgUrl ?? undefined, replyTo);
            }
        } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send message. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
    };

    // Typing indicator text
    const getTypingText = () => {
        if (currentTyping.length === 0) return null;
        if (currentTyping.length === 1) return `${currentTyping[0].displayName} is typing...`;
        if (currentTyping.length === 2) return `${currentTyping[0].displayName} and ${currentTyping[1].displayName} are typing...`;
        return "Several people are typing...";
    };

    const typingText = getTypingText();

    return (
        <div className="flex flex-col bg-background">
            {/* Typing indicator */}
            {typingText && (
                <div className="flex items-center gap-2 px-4 py-1">
                    <div className="flex gap-0.5">
                        <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                        <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                        <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </div>
                    <p className="text-xs text-muted-foreground italic">{typingText}</p>
                </div>
            )}

            {imagePreview && (
                <div className="relative w-fit ml-3 mb-1">
                    <img src={imagePreview} alt="preview" className="h-24 w-24 object-cover rounded-lg border border-border/50" />
                    <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 hover:opacity-90">
                        <X className="size-3" />
                    </button>
                </div>
            )}

            {replyingTo && (
                <div className="flex items-center justify-between p-2 mx-3 mb-1 bg-muted/50 rounded-lg border border-border/50">
                    <div className="flex flex-col overflow-hidden border-l-2 border-primary pl-2">
                        <span className="font-semibold text-xs text-primary">
                            Replying to {replyingTo.isOwn
                                ? "yourself"
                                : selectedConv.participants.find(p => p._id === replyingTo.senderId)?.displayName ?? "Unknown"
                            }
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                            {replyingTo.content || (replyingTo.imgUrl ? "📷 Image" : "Message")}
                        </span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-smooth shrink-0">
                        <X className="size-4" />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-2 p-3 min-h-[56px]">
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 transition-smooth" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <ImagePlus className="size-4" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
                <div className="flex-1 relative">
                    <Input
                        ref={inputRef}
                        onKeyDown={handleKeyPress}
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            if (e.target.value) {
                                emitTypingStart();
                            } else {
                                emitTypingStop();
                            }
                        }}
                        placeholder="Message..."
                        disabled={uploading}
                        className="pr-20 h-9 bg-white border-border/50 transition-smooth resize-none"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon" className="size-8 hover:bg-primary/10 transition-smooth">
                            <div>
                                <EmojiPicker onChange={(emoji: string) => {
                                    setValue(`${value}${emoji}`);
                                    emitTypingStart();
                                    inputRef.current?.focus();
                                }} />
                            </div>
                        </Button>
                    </div>
                </div>
                <Button onClick={sendMessage} className="bg-gradient-chat hover:shadow-glow transition-smooth hover:scale-105" disabled={(!value.trim() && !imageFile) || uploading}>
                    {uploading ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="size-4 text-white" />}
                </Button>
            </div>
        </div>
    );
};

export default MessageInput;