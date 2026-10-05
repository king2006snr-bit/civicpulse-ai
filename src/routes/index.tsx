import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/civic/Logo";
import { ThemeToggle } from "@/components/civic/ThemeToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "CivicPulse AI — AI-Powered Urban Infrastructure Intelligence",
      },
      {
        name: "description",
        content:
          "Report problems, detect infrastructure risks and help cities prioritize action. CivicPulse AI connects citizen reports with AI risk analysis for city teams.",
      },
      {
        property: "og:title",
        content: "CivicPulse AI — AI-Powered Urban Infrastructure Intelligence",
      },
      {
        property: "og:description",
        content:
          "Citizens report infrastructure problems, CivicPulse AI scores the risk, authorities act on what matters first.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const roles = [
  {
    key: "citizen",
    label: "Citizen",
    icon: Megaphone,
    eyebrow: "For residents",
    body: "Report infrastructure problems and track complaints.",
    points: [
      "Photo and location in seconds",
      "Live status on every complaint",
      "Visible when the ward team responds",
    ],
    to: "/login/citizen" as const,
    cta: "Citizen Login",
    tile: "bg-accent text-primary",
    button: "border-primary/25 bg-card text-primary hover:bg-accent hover:text-primary",
  },
  {
    key: "authority",
    label: "Authority",
    icon: Building2,
    eyebrow: "For city teams",
    body: "Monitor infrastructure, analyze risk, and prioritize action.",
    points: [
      "City-wide asset health scores",
      "Risk-ranked repair queue",
      "Council-ready reports and exports",
    ],
    to: "/login/authority" as const,
    cta: "Authority Login",
    tile: "civic-gradient text-primary-foreground",
    button: "civic-gradient text-primary-foreground hover:opacity-95",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="min-w-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="rounded-xl">
              <Link to="/login/citizen">Citizen Login</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/login/authority">Authority Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- Hero & Role Portals Only ---------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 civic-glow" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 civic-hero-grid civic-grid-fade"
            aria-hidden
          />
          <div className="relative mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 sm:pt-20">
            <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1 text-xs font-semibold text-primary shadow-card">
              <span className="animate-pulse-dot size-1.5 rounded-full bg-teal" aria-hidden />
              Urban Infrastructure Intelligence
            </span>
            <h1
              className="animate-rise mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "80ms" }}
            >
              CivicPulse <span className="civic-text-gradient">AI</span>
            </h1>
            <p
              className="animate-rise mx-auto mt-5 max-w-2xl font-display text-xl font-medium sm:text-2xl"
              style={{ animationDelay: "160ms" }}
            >
              AI-Powered Urban Infrastructure Intelligence
            </p>
            <p
              className="animate-rise mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg"
              style={{ animationDelay: "240ms" }}
            >
              Report problems. Detect infrastructure risks. Help cities prioritize action.
            </p>
          </div>

          {/* ---------- Role cards (Citizen & Authority login) ---------- */}
          <div
            id="roles"
            className="animate-rise relative mx-auto mt-12 grid max-w-4xl gap-6 px-4 pb-20 sm:px-6 md:grid-cols-2 lg:mt-14"
            style={{ animationDelay: "320ms" }}
          >
            {roles.map((role) => (
              <Card
                key={role.key}
                className="group relative overflow-hidden rounded-3xl border-border/80 bg-card/95 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
              >
                <CardContent className="flex h-full flex-col p-7 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`grid size-12 place-items-center rounded-2xl shadow-card ${role.tile}`}
                    >
                      <role.icon className="size-6" />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {role.eyebrow}
                    </span>
                  </div>

                  <h2 className="mt-6 font-display text-2xl font-semibold">{role.label}</h2>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">{role.body}</p>

                  <ul className="mt-6 space-y-2.5">
                    {role.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-primary">
                          <Check className="size-3" />
                        </span>
                        <span className="text-muted-foreground">{point}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className={`mt-8 w-full rounded-xl cursor-pointer ${role.button}`}
                  >
                    <Link to={role.to}>
                      {role.cta}
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
          <Logo />
          <p className="text-xs text-muted-foreground">
            © 2026 CivicPulse AI · Urban Infrastructure Intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}
