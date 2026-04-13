import { Card } from "@/components/ui/card";
import { formatOnlineTime, cn } from "@/lib/utils";
import { MoreHorizontal, EyeOff, Trash2, Pencil, LogOut } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatCardProps {
    convId: string;
    name: string;
    timestamp?: Date;
    isActive: boolean;
    onSelect: (id: string) => void;
    unreadCount?: number;
    leftSection: React.ReactNode;
    subtitle?: React.ReactNode;
    onHide?: () => void;
    onDelete?: () => void;
    onRename?: () => void;
    onLeave?: () => void;
}

const ChatCard = ({ convId, name, timestamp, isActive, onSelect, unreadCount, leftSection, subtitle, onHide, onDelete, onRename, onLeave }: ChatCardProps) => {
    const showMenu = onHide || onDelete || onRename || onLeave;

    return (
        <Card
            className={cn(
                "border-none p-3 cursor-pointer transition-smooth glass hover:bg-muted/30 group",
                isActive && "gradient-selected"
            )}
            onClick={() => onSelect(convId)}
        >
            <div className="flex items-center gap-3">
                <div className="relative">{leftSection}</div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className={cn(
                            "font-semibold text-sm truncate",
                            unreadCount && unreadCount > 0 && "text-foreground"
                        )}>
                            {name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {timestamp ? formatOnlineTime(timestamp) : ""}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 flex-1 min-w-0">{subtitle}</div>

                        {showMenu ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <div
                                        className="opacity-0 group-hover:opacity-100 transition-smooth p-1 rounded hover:bg-muted"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MoreHorizontal className="size-4 text-muted-foreground" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                    {onRename && (
                                        <DropdownMenuItem onClick={onRename} className="gap-2 cursor-pointer">
                                            <Pencil className="size-4" />
                                            Rename group
                                        </DropdownMenuItem>
                                    )}
                                    {onRename && (onHide || onDelete || onLeave) && (
                                        <DropdownMenuSeparator />
                                    )}
                                    {onHide && (
                                        <DropdownMenuItem onClick={onHide} className="gap-2 cursor-pointer">
                                            <EyeOff className="size-4" />
                                            Hide conversation
                                        </DropdownMenuItem>
                                    )}
                                    {onDelete && (
                                        <DropdownMenuItem
                                            onClick={onDelete}
                                            className="gap-2 cursor-pointer focus:text-warning"
                                        >
                                            <Trash2 className="size-4" />
                                            Delete conversation
                                        </DropdownMenuItem>
                                    )}
                                    {onLeave && (
                                        <DropdownMenuItem
                                            onClick={onLeave}
                                            className="gap-2 cursor-pointer focus:text-destructive"
                                        >
                                            <LogOut className="size-4" />
                                            Leave group
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <MoreHorizontal className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-smooth" />
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default ChatCard;