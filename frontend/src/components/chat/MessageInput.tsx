import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation } from "@/types/chat";
import { useChatStore } from "@/stores/useChatStore";
import { useBlockStore } from "@/stores/useBlockStore";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { ImagePlus, X, Send, Ban } from "lucide-react";
import { Input } from "../ui/input";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";
import api from "@/lib/axios";

const MessageInput = ({ selectedConv }: { selectedConv: Conversation }) => {
    const { user } = useAuthStore();
    const { sendDirectMessage, sendGroupMessage } = useChatStore();
    const { isBlocked, isBlockedBy } = useBlockStore();
    const [value, setValue] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!uploading) inputRef.current?.focus();
    }, [uploading]);

    if (!user) return null;

    const otherUser = selectedConv.type === "direct"
        ? selectedConv.participants.find(p => p._id !== user._id)
        : null;

    const iBlockedThem = otherUser ? isBlocked(otherUser._id) : false;
    const theyBlockedMe = otherUser ? isBlockedBy(otherUser._id) : false;
    const isBlockedSituation = iBlockedThem || theyBlockedMe;

    if (selectedConv.type === "direct" && isBlockedSituation) {
        return (
            <div className="flex items-center justify-center gap-2 p-4 bg-background border-t border-border/30">
                <Ban className="size-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    {iBlockedThem
                        ? "You have blocked this user. Unblock to send messages."
                        : "You can't reply to this conversation."
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
        setValue("");
        try {
            setUploading(true);
            const imgUrl = await uploadImage();
            handleRemoveImage();
            if (selectedConv.type === "direct") {
                const otherUser = selectedConv.participants.find(p => p._id !== user._id);
                if (!otherUser) return;
                await sendDirectMessage(otherUser._id, currValue, imgUrl ?? undefined);
            } else {
                await sendGroupMessage(selectedConv._id, currValue, imgUrl ?? undefined);
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

    return (
        <div className="flex flex-col gap-2 p-3 bg-background">
            {imagePreview && (
                <div className="relative w-fit ml-1">
                    <img src={imagePreview} alt="preview" className="h-24 w-24 object-cover rounded-lg border border-border/50" />
                    <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 hover:opacity-90">
                        <X className="size-3" />
                    </button>
                </div>
            )}
            <div className="flex items-center gap-2 min-h-[56px]">
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 transition-smooth" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <ImagePlus className="size-4" />
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
                <div className="flex-1 relative">
                    <Input
                        ref={inputRef}
                        onKeyDown={handleKeyPress}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Message..."
                        disabled={uploading}
                        className="pr-20 h-9 bg-white border-border/50 focus:hover-primary/50 transition-smooth resize-none"
                    />
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <Button asChild variant="ghost" size="icon" className="size-8 hover:bg-primary/10 transition-smooth">
                            <div>
                                <EmojiPicker onChange={(emoji: string) => { setValue(`${value}${emoji}`); inputRef.current?.focus(); }} />
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