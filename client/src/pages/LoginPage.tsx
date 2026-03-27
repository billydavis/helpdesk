import { Navigate, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "../lib/auth-client";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (isPending) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>;
  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (values: FormValues) => {
    const { error: signInError } = await authClient.signIn.email(values);

    if (signInError) {
      setError("root", { message: signInError.message ?? "Sign in failed. Please try again." });
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Helpdesk</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.email ? "border-destructive" : "border-input"}`}
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.password ? "border-destructive" : "border-input"}`}
                {...register("password")}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>

            {errors.root && (
              <p role="alert" className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
