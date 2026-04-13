import type { Conversation, Message, Participant } from "@/types/chat";
import UserAvatar from "./UserAvatar";
import { cn, formatMessageTime } from "@/lib/utils";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";

interface MessageItemProps {
    message: Message;
    index: number;
    messages: Message[];
    selectedConv: Conversation;
    lastMessageStatus: "delivered" | "seen";
}

const MessageItem = ({ message, index, messages, selectedConv, lastMessageStatus }: MessageItemProps) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const prev = index + 1 < messages.length ? messages[index + 1] : undefined;

    const isShowTime = index === 0 ||
        new Date(message.createdAt).getTime() - new Date(prev?.createdAt || 0).getTime() > 300000;

    const isGroupBreak = isShowTime || message.senderId !== prev?.senderId;

    const participant = selectedConv.participants.find(
        (p: Participant) => p._id.toString() === message.senderId.toString()
    );

    return (
        <>
            {isShowTime && (
                <span className="flex justify-center text-xs text-muted-foreground px-1">
                    {formatMessageTime(new Date(message.createdAt))}
                </span>
            )}

            <div className={cn(
                "flex gap-2 message-bounce mt-1",
                message.isOwn ? "justify-end" : "justify-start"
            )}>
                {!message.isOwn && (
                    <div className="w-8">
                        {isGroupBreak && (
                            <UserAvatar
                                type="chat"
                                name={participant?.displayName || "Verdi User"}
                                avatarUrl={participant?.avatarUrl || undefined}
                            />
                        )}
                    </div>
                )}

                <div className={cn(
                    "max-w-xs lg:max-w-md space-y-1 flex flex-col",
                    message.isOwn ? "items-end" : "items-start"
                )}>
                    {/* Image */}
                    {message.imgUrl && (
                        <div
                            className="cursor-pointer rounded-lg overflow-hidden border border-border/30"
                            onClick={() => setLightboxOpen(true)}
                        >
                            <img
                                src={message.imgUrl}
                                alt="message image"
                                className="max-h-60 max-w-xs object-cover hover:opacity-90 transition-opacity"
                            />
                        </div>
                    )}

                    {/* Text content */}
                    {message.content && (
                        <Card className={cn(
                            "p-3",
                            message.isOwn ? "chat-bubble-sent border-0" : "chat-bubble-received"
                        )}>
                            <p className="text-sm leading-relaxed break-words">{message.content}</p>
                        </Card>
                    )}

                    {/* Seen/Delivered */}
                    {message.isOwn && message._id === selectedConv.lastMessage?._id && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-xs px-1.5 py-0.5 h-4 border-0",
                                lastMessageStatus === "seen"
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            {lastMessageStatus}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Lightbox preview image */}
            {message.imgUrl && (
                <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                    <DialogContent className="max-w-3xl border-none bg-black/90 p-2">
                        <img
                            src={message.imgUrl}
                            alt="full size"
                            className="w-full h-full object-contain max-h-[80vh] rounded-lg"
                        />
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default MessageItem;