import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function AuthShell({
  title,
  subtitle,
  highlights,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  highlights: string[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      <div className="relative hidden flex-col justify-between civic-gradient p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 civic-hero-grid opacity-40" />
        <div className="relative flex items-center justify-between">
          <Link to="/" className="inline-flex rounded-2xl bg-card/95 px-3 py-2 text-foreground">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" /> Back to Home
          </Link>
        </div>
        <div className="relative space-y-5">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Predict infrastructure failures before they become headlines.
          </h2>
          <ul className="space-y-3 text-sm text-primary-foreground/90">
            {highlights.map((h) => (
              <li key={h} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-foreground" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/75">
          Vijayawada Municipal Corporation · sample city telemetry
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8 relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/"
            className="lg:hidden inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
