import { useAuthStore } from "@/stores/useAuthStore";
import type { Conversation, Message } from "@/types/chat";
import { useChatStore } from "@/stores/useChatStore";
import { useState } from "react";
import { Button } from "../ui/button"
import { ImagePlus } from "lucide-react"
import { Input } from "../ui/input";
import { Send } from "lucide-react";
import EmojiPicker from "./EmojiPicker";
import { toast } from "sonner";

const MessageInput = ({selectedConv} : {selectedConv: Conversation}) => {
    const {user} = useAuthStore();
    const {sendDirectMessage, sendGroupMessage} = useChatStore();
    const [value, setValue] = useState("");

    if(!user) return;

    const sendMessage = async () => {
        if (!value.trim()) return;
        const currValue = value;
        setValue("");

        try {
            if(selectedConv.type === "direct") {
                const participants = selectedConv.participants;
                const otherUser = participants.filter((p: { _id: string; }) => p._id !== user._id)[0];
                await sendDirectMessage(otherUser._id, currValue);
            }
            else {
                await sendGroupMessage(selectedConv._id, currValue);
            }
        }
        catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send message. Please try again.");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    };
    

    return (
        <div className="flex items-center gap-2 p-3 min-h-[56px] bg-background">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10 transition-smooth">
                <ImagePlus className="size-4"/>
            </Button>
            
            <div className="flex-1 relative">
                <Input
                    onKeyDown={handleKeyPress}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Message..."
                    className="pr-20 h-9 bg-white border-border/50 focus:hover-primary/50 
                    transition-smooth resize-none"
                >
                </Input>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex
                items-center gap-1">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="size-8 hover:bg-primary/10 transition-smooth"
                    >
                        <div>
                           <EmojiPicker onChange={(emoji:string) => setValue(`${value}${emoji}`)}/>
                        </div>
                    </Button>
                </div>
            </div>
            <Button 
                onClick={sendMessage}
                className="bg-gradient-chat hover:shadown-glow transition-smooth
                hover:scale-105"
                disabled={!value.trim()}
            >
                <Send className="size-4 text-white"/>
            </Button>
        </div>
    );
}

export default MessageInput;