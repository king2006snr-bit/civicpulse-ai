import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/civic/AuthShell";
import {
  AUTHORITY_DEMO,
  hasFieldErrors,
  mockLatency,
  validateAuthorityLoginForm,
  verifyAuthorityCredentials,
  type AuthFieldErrors,
} from "@/lib/mock-auth";

export const Route = createFileRoute("/login/authority")({
  head: () => ({
    meta: [
      { title: "Authority Login — CivicPulse AI" },
      {
        name: "description",
        content:
          "Municipal staff sign in to the CivicPulse AI command center for the city-wide risk queue, predictions and reports.",
      },
      { property: "og:title", content: "Authority Login — CivicPulse AI" },
      {
        property: "og:description",
        content: "Access the City Infrastructure Command Center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthorityLogin,
});

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthorityLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setTimeout(() => {
      setGoogleLoading(false);
      toast.success("Authorized via Google Workspace", {
        description: "Welcome to City Infrastructure Command Center.",
      });
      navigate({ to: "/authority" });
    }, 600);
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    const fieldErrors = validateAuthorityLoginForm(email, password);
    setErrors(fieldErrors);
    if (hasFieldErrors(fieldErrors)) return;

    setPending(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "authority" }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (typeof window !== "undefined") {
            localStorage.setItem("civicpulse_auth_user", JSON.stringify(data.user));
          }
          toast.success("Welcome back, " + (data.user?.name || "Officer"));
          await navigate({ to: "/authority" });
          return;
        }
      }
    } catch (err) {
      console.warn("Backend auth request error:", err);
    }

    if (verifyAuthorityCredentials(email, password)) {
      await navigate({ to: "/authority" });
      return;
    }

    setPending(false);
    setFormError("Invalid credentials. Check the official email and password, then try again.");
  }

  function onForgotPassword() {
    setErrors({});
    setFormError(null);
    setNotice(null);

    if (!email.trim()) {
      setFormError("Enter your official email first, then request a reset link.");
      return;
    }
    setNotice(`Password reset link sent to ${email.trim()} (demo environment).`);
  }

  function useDemoCredentials() {
    setEmail(AUTHORITY_DEMO.email);
    setPassword(AUTHORITY_DEMO.password);
    setErrors({});
    setFormError(null);
    setNotice(null);
  }

  return (
    <AuthShell
      title="Authority Login"
      subtitle="Access the City Infrastructure Command Center."
      highlights={[
        "City-wide risk queue ranked by AI severity",
        "Predicted failure windows with cost estimates",
        "Council-ready reports exported in one click",
      ]}
      footer={
        <>
          Are you a citizen?{" "}
          <Link to="/login/citizen" className="font-semibold text-primary hover:underline">
            Citizen Login
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {/* Continue with Google */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full rounded-xl flex items-center justify-center gap-3 border-border hover:bg-accent/60 cursor-pointer text-sm font-medium"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || pending}
        >
          {googleLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <GoogleIcon className="size-4.5" />
          )}
          <span>Continue with Google</span>
        </Button>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <span className="relative bg-card px-3 text-xs text-muted-foreground uppercase tracking-wider">
            or continue with credentials
          </span>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 px-3.5 py-3 text-sm text-success-foreground"
            >
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Official Email / Authority ID</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="name@city.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="rounded-xl"
            />
            {errors.email && (
              <p id="email-error" className="text-xs font-medium text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="rounded-xl"
            />
            {errors.password && (
              <p id="password-error" className="text-xs font-medium text-destructive">
                {errors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl cursor-pointer"
            disabled={pending || googleLoading}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Signing in
              </>
            ) : (
              "Login"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full rounded-xl cursor-pointer"
            onClick={onForgotPassword}
          >
            Forgot Password
          </Button>
        </form>

        <div className="rounded-xl border border-dashed border-primary/30 bg-accent/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Demo credentials
          </p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-mono text-foreground">{AUTHORITY_DEMO.email}</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="text-muted-foreground">Password</dt>
              <dd className="font-mono text-foreground">{AUTHORITY_DEMO.password}</dd>
            </div>
          </dl>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0 cursor-pointer"
            onClick={useDemoCredentials}
          >
            Fill demo credentials
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
