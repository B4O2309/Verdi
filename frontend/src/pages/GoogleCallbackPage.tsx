import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { toast } from "sonner";

const GoogleCallbackPage = () => {
    const navigate = useNavigate();
    const { setAccessToken, fetchMe } = useAuthStore();
    const { fetchConversations } = useChatStore();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("accessToken");
        const error = params.get("error");

        if (error || !accessToken) {
            toast.error("Google sign-in failed. Please try again.");
            navigate("/signin");
            return;
        }

        const init = async () => {
            try {
                setAccessToken(accessToken);
                await fetchMe();
                await fetchConversations();
                toast.success("Signed in with Google!");
                navigate("/");
            } catch {
                toast.error("Failed to load user info.");
                navigate("/signin");
            }
        };

        init();
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-muted-foreground animate-pulse">Signing in with Google...</p>
        </div>
    );
};

export default GoogleCallbackPage;