import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AuthShell } from "@/components/civic/AuthShell";

export const Route = createFileRoute("/login/citizen")({
  head: () => ({
    meta: [
      { title: "Citizen login — CivicPulse AI" },
      {
        name: "description",
        content: "Sign in to report neighbourhood infrastructure issues and track their progress.",
      },
      { property: "og:title", content: "Citizen login — CivicPulse AI" },
      {
        property: "og:description",
        content: "Report issues in your ward and follow every update from the city team.",
      },
    ],
  }),
  component: CitizenLogin,
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

function CitizenLogin() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "citizen@civicpulse.ai", role: "citizen" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof window !== "undefined") {
          localStorage.setItem("civicpulse_citizen_user", JSON.stringify(data.user));
        }
      }
    } catch (err) {
      console.warn("Auth sync warning:", err);
    }

    setGoogleLoading(false);
    toast.success("Signed in with Google", {
      description: "Welcome to the CivicPulse citizen reporting portal.",
    });
    navigate({ to: "/citizen" });
  };

  return (
    <AuthShell
      title="Citizen sign in"
      subtitle="Report issues in your ward and follow every update the city posts."
      highlights={[
        "Submit a report with a photo in under a minute",
        "See AI severity scoring on your own submissions",
        "Get notified when a crew is assigned",
      ]}
      footer={
        <>
          Authority staff?{" "}
          <Link to="/login/authority" className="font-semibold text-primary hover:underline">
            Use the authority portal
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
          disabled={googleLoading}
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
            or continue with email
          </span>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const emailInput = (e.currentTarget.elements.namedItem("email") as HTMLInputElement)
              ?.value;
            try {
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: emailInput || "citizen@civicpulse.ai",
                  role: "citizen",
                }),
              });
              if (res.ok) {
                const data = await res.json();
                if (typeof window !== "undefined") {
                  localStorage.setItem("civicpulse_citizen_user", JSON.stringify(data.user));
                }
              }
            } catch (err) {
              console.warn("Citizen auth sync warning:", err);
            }

            toast.success("Signed in successfully", {
              description: "Welcome back to your civic portal.",
            });
            navigate({ to: "/citizen" });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email or mobile number</Label>
            <Input
              id="email"
              name="email"
              placeholder="you@example.com"
              defaultValue="citizen@demo.city"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" defaultValue="demo1234" className="rounded-xl" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox defaultChecked /> Remember me
            </label>
            <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
              Forgot password?
            </span>
          </div>
          <Button type="submit" size="lg" className="w-full rounded-xl cursor-pointer">
            Sign in as citizen
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo credentials are pre-filled — or click Continue with Google.
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
