import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "../ui/label"
import {z} from "zod"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import { useAuthStore } from "@/stores/useAuthStore"
import { Link, useNavigate } from "react-router"

const signUpSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const {signUp} = useAuthStore();
  const navigate = useNavigate()
  const {register, handleSubmit, formState: {errors, isSubmitting}} = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormValues) => {
    const {firstname, lastname, username, email, password} = data;
    // Call sign up function from auth store here

    await signUp(username, password, firstname, lastname, email);
    navigate("/signin"); 
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-border">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              {/* Header - Logo */}
              <div className="flex flex-col items-center gap-2 text-center">
                <a href="/"
                  className="mx-auto block w-fit text-center"
                >
                  <img className="h-25 w-auto"
                    src="/logo.png"
                    alt="Verdi Logo"
                  /> 
                </a>

                <h1 className="text-2xl font-bold">Create your Verdi account</h1>
                <p className="text-muted-foreground text-balance">
                  Welcome! Please sign up to start using Verdi!
                </p>
              </div>

              {/* Last Name & First Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="lastname" className="block text-sm">
                    Last Name
                  </Label>
                  <Input
                    id="lastname"
                    type="text"
                    {...register("lastname")}
                  />
                  {errors.lastname && (
                    <p className="text-sm text-destructive">
                      {errors.lastname.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstname" className="block text-sm">
                    First Name
                  </Label>
                  <Input
                    id="firstname"
                    type="text"
                    {...register("firstname")}
                  />
                  {errors.firstname && (
                    <p className="text-sm text-destructive">
                      {errors.firstname.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Username */}
              <div className="flex flex-col gap-3">
                <Label 
                  htmlFor="username" 
                  className="block text-sm">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Verdi"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-sm text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-3">
                <Label 
                  htmlFor="email" 
                  className="block text-sm">
                  Email
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="v@gmail.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-3">
                <Label 
                  htmlFor="password" 
                  className="block text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                />  
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Sign Up Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}>
                Create Account
              </Button>

              <div className="text-center text-sm">
                Already have an account {` `}
                <Link to="/signin" className="text-primary underline underline-offset-4">
                  Sign in
                </Link>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeHolderSignUp_1.png"
              alt="Image"
              className="absolute top-1/2 -translate-y-1/2 object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <div className="px-6 text-center text-xs text-balance *:[a]:hover:text-primary *:[a]:underline *:[a]:underline-offset-4">
        By continuing, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
