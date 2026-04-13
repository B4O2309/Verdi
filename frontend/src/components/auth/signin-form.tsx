import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "../ui/label"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthStore } from "@/stores/useAuthStore"
import { Link, useNavigate } from "react-router"
import { useState } from "react"
import ForgotPasswordDialog from "./ForgotPasswordDialog"

const signInSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SigninForm({ className, ...props }: React.ComponentProps<"div">) {
    const { signIn } = useAuthStore();
    const navigate = useNavigate();
    const [openForgot, setOpenForgot] = useState(false);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInFormValues>({
        resolver: zodResolver(signInSchema),
    });

    const onSubmit = async (data: SignInFormValues) => {
        await signIn(data.username, data.password);
        navigate("/");
    };

    const handleGoogleSignIn = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
    };

    return (
        <>
            <div className={cn("flex flex-col gap-6", className)} {...props}>
                <Card className="overflow-hidden p-0 border-border">
                    <CardContent className="grid p-0 md:grid-cols-2">
                        <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
                            <div className="flex flex-col gap-6">
                                {/* Header */}
                                <div className="flex flex-col items-center gap-2 text-center">
                                    <a href="/" className="mx-auto block w-fit text-center">
                                        <img className="h-25 w-auto" src="/logo.png" alt="Verdi Logo" />
                                    </a>
                                    <h1 className="text-2xl font-bold">Welcome back</h1>
                                    <p className="text-muted-foreground text-balance">
                                        Please sign in to continue using Verdi!
                                    </p>
                                </div>

                                {/* Username */}
                                <div className="flex flex-col gap-3">
                                    <Label htmlFor="username" className="block text-sm">Username</Label>
                                    <Input id="username" type="text" placeholder="Verdi" {...register("username")} />
                                    {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
                                </div>

                                {/* Password */}
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="block text-sm">Password</Label>
                                        <button
                                            type="button"
                                            onClick={() => setOpenForgot(true)}
                                            className="text-sm text-primary hover:underline underline-offset-4"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <Input id="password" type="password" {...register("password")} />
                                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                                </div>

                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    Sign In
                                </Button>

                                {/* Divider */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">or</span>
                                    </div>
                                </div>


                                {/* Google Sign In */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full gap-2"
                                    onClick={handleGoogleSignIn}
                                >
                                    <svg width="18" height="18" viewBox="0 0 48 48">
                                        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.1 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-4.5z"/>
                                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.8 0 5.3 1 7.2 2.8l5.7-5.7C33.5 7.1 29 5 24 5 16.3 5 9.7 9.1 6.3 14.7z"/>
                                        <path fill="#4CAF50" d="M24 45c5 0 9.5-1.9 12.9-5l-5.9-5c-2 1.5-4.5 2.3-7 2.3-5.2 0-9.6-3.5-11.2-8.3l-6.5 5C9.5 40.5 16.3 45 24 45z"/>
                                        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l5.9 5C40.7 35.4 44 30.6 44 25c0-1.3-.1-2.6-.4-4.5z"/>
                                    </svg>
                                    Continue with Google
                                </Button>

                                <div className="text-center text-sm">
                                    Not a member?{" "}
                                    <Link to="/signup" className="text-primary underline underline-offset-4">Sign up</Link>
                                </div>
                            </div>
                        </form>

                        <div className="bg-muted relative hidden md:block">
                            <img src="/placeHolderSignIn.png" alt="Image" className="absolute top-1/2 -translate-y-1/2 object-cover" />
                        </div>
                    </CardContent>
                </Card>

                <div className="px-6 text-center text-xs text-balance *:[a]:hover:text-primary *:[a]:underline *:[a]:underline-offset-4">
                    By continuing, you agree to our <a href="#">Terms of Service</a>{" "}and <a href="#">Privacy Policy</a>.
                </div>
            </div>

            <ForgotPasswordDialog open={openForgot} onClose={() => setOpenForgot(false)} />
        </>
    );
}