import { useChatStore } from "@/stores/useChatStore";
import ChatWelcomeSreen from "./ChatWelcomeScreen";
import ChatWindowHeader from "./ChatWindowHeader";
import ChatWindowSkeleton from "./ChatWindowSkeleton";
import ChatWindowBody from "./ChatWindowBody";
import MessageInput from "./MessageInput";
import { SidebarInset } from "../ui/sidebar";

const ChatWindowLayout = () => {
    const {activeConversationId, conversations, messageLoading: loading, messages} = useChatStore();
    
    const selectedConv = conversations.find((c) => c._id === activeConversationId) ?? null;

    if (!selectedConv) {
        return <ChatWelcomeSreen/>;
    }

    if(loading) {
        return <ChatWindowSkeleton/>;
    }

    return (
        <SidebarInset className="flex flex-col h-full flex-1 overflow-hidden rounded-sm shadow-md">
            {/* Header */}
            <ChatWindowHeader chat={selectedConv}/>
            {/* Body */}
            <div className="flex-1 overflow-y-auto
            bg-primary-foreground">
                <ChatWindowBody/>

            </div>
            {/* Footer */}
            <MessageInput selectedConv={selectedConv}/>

        </SidebarInset>
    );
}

export default ChatWindowLayout;