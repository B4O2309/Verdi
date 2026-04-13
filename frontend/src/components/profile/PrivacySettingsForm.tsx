import { Bell, Shield, ShieldBan } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { useState } from "react"
import ChangePasswordDialog from "./ChangePasswordDialog"
import { useAuthStore } from "@/stores/useAuthStore"

const PrivacySettingsForm = () => {
    const { user } = useAuthStore();
    const [openChangePassword, setOpenChangePassword] = useState(false);

    // Google only account: has googleId but no hashedPassword
    const isGoogleOnly = !!user?.googleId && !user?.hasPassword;

    return (
        <>
            <Card className="glass-strong border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Privacy Settings
                    </CardTitle>
                    <CardDescription>
                        Manage your privacy preferences.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        {/* Google Only Account */}
                        {isGoogleOnly ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/30 glass-light">
                                <svg width="16" height="16" viewBox="0 0 48 48" className="shrink-0">
                                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.1 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-4.5z"/>
                                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.7 9.1 6.3 14.7z"/>
                                    <path fill="#4CAF50" d="M24 45c5 0 9.5-1.9 12.9-5l-5.9-5c-2 1.5-4.5 2.3-7 2.3-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.5 40.5 16.3 45 24 45z"/>
                                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l5.9 5C40.7 35.4 44 30.6 44 25c0-1.3-.1-2.6-.4-4.5z"/>
                                </svg>
                                <div>
                                    <p className="text-sm font-medium">Signed in with Google</p>
                                    <p className="text-xs text-muted-foreground">
                                        Password is managed by Google. Visit your Google account to change it.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full justify-start glass-light border-border/30 hover:text-warning"
                                onClick={() => setOpenChangePassword(true)}
                            >
                                <Shield className="h-4 w-4 mr-2" />
                                Change Password
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            className="w-full justify-start glass-light border-border/30 hover:text-info"
                        >
                            <Bell className="h-4 w-4 mr-2" />
                            Notification Settings
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-start glass-light border-border/30 hover:text-destructive"
                        >
                            <ShieldBan className="size-4 mr-2" />
                            Block Users
                        </Button>
                    </div>

                    <div className="pt-4 border-t border-border/30">
                        <h4 className="font-medium mb-3 text-destructive">Danger Zone</h4>
                        <Button variant="destructive" className="w-full">
                            Delete Account
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <ChangePasswordDialog
                open={openChangePassword}
                onClose={() => setOpenChangePassword(false)}
            />
        </>
    );
};

export default PrivacySettingsForm;