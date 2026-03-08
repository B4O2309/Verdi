import { useChatStore } from "@/stores/useChatStore.ts";
import ChatWelcomeScreen from "./ChatWelcomeScreen";
import MessageItem from "./MessageItem";

const ChatWindowBody = () => {
    const {activeConversationId, conversations, messages: allMessages} = useChatStore();
    const messages = allMessages[activeConversationId!]?.items ?? [];
    const selectedConv = conversations.find((c) => c._id === activeConversationId);

    if(!selectedConv) {
        return <ChatWelcomeScreen/>;
    }

    if(!messages.length) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No messages yet. Start the conversation!
            </div>
        );
    }
    return (
        <div className="p-4 bg-primary-foreground h-full flex flex-col overflow-hidden">
            <div className="flex flex-col overflow-y-auto overflow-x-hidden beautiful-scrollbar">
                {messages.map((message, index) => (
                    <MessageItem
                        key={message._id ?? index}
                        message={message}
                        index={index}
                        messages={messages}
                        selectedConv={selectedConv}
                        lastMessageStatus="delivered"
                    />
                ))}
            </div>
        </div>
    );
}

export default ChatWindowBody;