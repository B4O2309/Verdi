import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { authService } from "@/services/authService"
import { toast } from "sonner"
import { Eye, EyeOff, Mail, KeyRound, Lock } from "lucide-react"

interface ForgotPasswordDialogProps {
    open: boolean;
    onClose: () => void;
}

type Step = "email" | "otp" | "reset";

const ForgotPasswordDialog = ({ open, onClose }: ForgotPasswordDialogProps) => {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleClose = () => {
        setStep("email");
        setEmail("");
        setOtpDigits(["", "", "", "", "", ""]);
        setNewPassword("");
        setConfirmPassword("");
        setShowNew(false);
        setShowConfirm(false);
        onClose();
    };

    const handleOtpChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, "").slice(-1);
        const newDigits = [...otpDigits];
        newDigits[index] = digit;
        setOtpDigits(newDigits);

        // Auto focus next
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "Enter" && otpDigits.every(d => d !== "")) {
            handleVerifyOtp();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newDigits = [...otpDigits];
        pasted.split("").forEach((char, i) => {
            newDigits[i] = char;
        });
        setOtpDigits(newDigits);
        const nextEmpty = pasted.length < 6 ? pasted.length : 5;
        inputRefs.current[nextEmpty]?.focus();
    };

    const handleSendOtp = async () => {
        if (!email) { toast.error("Please enter your email."); return; }
        try {
            setLoading(true);
            await authService.forgotPassword(email);
            toast.success("OTP sent to your email!");
            setStep("otp");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        const otp = otpDigits.join("");
        if (otp.length !== 6) { toast.error("Please enter the 6-digit OTP."); return; }
        try {
            setLoading(true);
            await authService.verifyOtp(email, otp);
            toast.success("OTP verified!");
            setStep("reset");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Invalid OTP.");
            setOtpDigits(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) { toast.error("Please fill in all fields."); return; }
        if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
        if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
        try {
            setLoading(true);
            await authService.resetPassword(email, otpDigits.join(""), newPassword);
            toast.success("Password reset successfully! Please sign in.");
            handleClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

    const stepConfig = {
        email: { title: "Forgot Password", icon: <Mail className="h-5 w-5 text-primary" /> },
        otp:   { title: "Enter OTP Code",  icon: <KeyRound className="h-5 w-5 text-primary" /> },
        reset: { title: "Reset Password",  icon: <Lock className="h-5 w-5 text-primary" /> },
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[400px] border-none">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {stepConfig[step].icon}
                        {stepConfig[step].title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    {/* Step 1: Email */}
                    {step === "email" && (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Enter your registered email and we'll send you a verification code.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="fp-email">Email Address</Label>
                                <Input
                                    id="fp-email"
                                    type="email"
                                    placeholder="Enter your email..."
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                                />
                            </div>
                            <Button className="w-full" onClick={handleSendOtp} disabled={loading}>
                                {loading ? "Sending..." : "Send OTP"}
                            </Button>
                        </>
                    )}

                    {/* Step 2: OTP — 6 ô riêng biệt */}
                    {step === "otp" && (
                        <>
                            <p className="text-sm text-muted-foreground text-center">
                                Code sent to <span className="font-medium text-foreground">{email}</span>
                                <br />
                                <span className="text-xs">Expires in 10 minutes</span>
                            </p>

                            {/* 6 ô OTP */}
                            <div className="flex gap-2 justify-center py-2" onPaste={handleOtpPaste}>
                                {otpDigits.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => { inputRefs.current[index] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        className={`
                                            w-11 h-14 text-center text-xl font-semibold rounded-lg
                                            border transition-all duration-150 bg-background
                                            focus:outline-none focus:ring-2 focus:ring-primary/50
                                            ${digit
                                                ? "border-primary text-primary"
                                                : "border-border text-foreground"
                                            }
                                        `}
                                    />
                                ))}
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleVerifyOtp}
                                disabled={loading || otpDigits.some(d => d === "")}
                            >
                                {loading ? "Verifying..." : "Verify OTP"}
                            </Button>

                            <button
                                type="button"
                                className="w-full text-sm text-muted-foreground hover:text-primary transition"
                                onClick={() => setStep("email")}
                            >
                                ← Back to email
                            </button>
                        </>
                    )}

                    {/* Step 3: Reset Password */}
                    {step === "reset" && (
                        <>
                            <p className="text-sm text-muted-foreground">Enter your new password below.</p>

                            <div className="space-y-2">
                                <Label htmlFor="fp-new-password">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="fp-new-password"
                                        type={showNew ? "text" : "password"}
                                        placeholder="Enter new password..."
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="pr-10"
                                    />
                                    <button type="button" onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fp-confirm-password">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="fp-confirm-password"
                                        type={showConfirm ? "text" : "password"}
                                        placeholder="Confirm new password..."
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pr-10"
                                        onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
                                {loading ? "Resetting..." : "Reset Password"}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ForgotPasswordDialog;