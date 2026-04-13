import { Shield, Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { useState } from "react"
import { authService } from "@/services/authService"
import { toast } from "sonner"
import ForgotPasswordDialog from "../auth/ForgotPasswordDialog"

interface ChangePasswordDialogProps {
    open: boolean;
    onClose: () => void;
}

const ChangePasswordDialog = ({ open, onClose }: ChangePasswordDialogProps) => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [openForgot, setOpenForgot] = useState(false);

    const handleClose = () => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowOld(false);
        setShowNew(false);
        setShowConfirm(false);
        onClose();
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields.");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }

        if (oldPassword === newPassword) {
            toast.error("New password must be different from old password.");
            return;
        }

        try {
            setLoading(true);
            await authService.changePassword(oldPassword, newPassword);
            toast.success("Password changed successfully!");
            handleClose();
        } catch (error: any) {
            const message = error?.response?.data?.message || "Failed to change password.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[400px] border-none">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            Change Password
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {/* Old Password */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="oldPassword">Current Password</Label>
                                {/* Forgot password link */}
                                <button
                                    type="button"
                                    onClick={() => setOpenForgot(true)}
                                    className="text-xs text-primary hover:underline underline-offset-4"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <Input
                                    id="oldPassword"
                                    type={showOld ? "text" : "password"}
                                    placeholder="Enter current password..."
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="glass-light border-border/30 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowOld(!showOld)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showNew ? "text" : "password"}
                                    placeholder="Enter new password..."
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="glass-light border-border/30 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew(!showNew)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Confirm new password..."
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="glass-light border-border/30 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                            onClick={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? "Changing..." : "Change Password"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ForgotPasswordDialog
                open={openForgot}
                onClose={() => setOpenForgot(false)}
            />
        </>
    );
};

export default ChangePasswordDialog;