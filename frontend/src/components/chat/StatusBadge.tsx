import { cn } from "@/lib/utils";

interface StatusBadgeProps {
    status: "online" | "offline";
    size?: "sm" | "md";
}

const StatusBadge = ({ status, size = "sm" }: StatusBadgeProps) => {
    return (
        <div className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card",
            size === "sm" && "size-4",
            size === "md" && "size-5",
            status === "online" && "status-online",
            status === "offline" && "status-offline"
        )} />
    );
};

export default StatusBadge;