import { Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import type { User } from "@/types/user";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

type EditableField = {
    key: keyof Pick<User, "displayName" | "username" | "email" | "phone">;
    label: string;
    type?: string;
};

const PERSONAL_FIELDS: EditableField[] = [
    { key: "displayName", label: "Display Name" },
    { key: "username", label: "Username" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "tel" },
];

type Props = {
    userInfo: User | null;
};

const PersonalInfoForm = ({ userInfo }: Props) => {
    const { updateProfile, loading } = useAuthStore();

    const [form, setForm] = useState({
        displayName: userInfo?.displayName || "",
        username: userInfo?.username || "",
        email: userInfo?.email || "",
        phone: userInfo?.phone || "",
        bio: userInfo?.bio || "",
    });

    if (!userInfo) return null;

    const handleChange = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateProfile(form);
    };

    return (
        <Card className="glass-strong border-border/30">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Heart className="size-5 text-primary" />
                    Personal Information
                </CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PERSONAL_FIELDS.map(({ key, label, type }) => (
                            <div key={key} className="space-y-2">
                                <Label htmlFor={key}>{label}</Label>
                                <Input
                                    id={key}
                                    type={type ?? "text"}
                                    value={form[key]}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    className="glass-light border-border/30"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                            id="bio"
                            value={form.bio}
                            onChange={(e) => handleChange("bio", e.target.value)}
                            className="glass-light border-border/30 resize-none"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-auto bg-gradient-primary hover:opacity-90 transition-opacity"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default PersonalInfoForm;