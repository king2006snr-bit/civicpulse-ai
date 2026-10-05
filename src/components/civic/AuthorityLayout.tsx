import { useState, type ReactNode } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Map,
  Building2,
  MessageSquareWarning,
  TrendingUp,
  FileText,
  Settings,
  Menu,
  Bell,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { to: "/authority", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/authority/map", label: "City Map", icon: Map },
  { to: "/authority/infrastructure", label: "Infrastructure", icon: Building2 },
  { to: "/authority/complaints", label: "Complaints", icon: MessageSquareWarning },
  { to: "/authority/predictions", label: "Predictions", icon: TrendingUp },
  { to: "/authority/reports", label: "Reports", icon: FileText },
  { to: "/authority/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: "exact" in item ? item.exact : false }}
          activeProps={{
            className:
              "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary hover:text-primary-foreground",
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <item.icon className="size-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/" onClick={onNavigate} className="px-1 pt-1">
        <Logo />
      </Link>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto rounded-2xl bg-surface p-4">
        <p className="text-xs font-semibold">AI engine status</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Last city-wide scan completed 2 hours ago across 1,284 assets.
        </p>
      </div>
      <Button asChild variant="ghost" className="justify-start gap-3 rounded-xl">
        <Link to="/login/authority" onClick={onNavigate}>
          <LogOut className="size-4" /> Sign out
        </Link>
      </Button>
    </div>
  );
}

export function AuthorityLayout({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 rounded-xl lg:hidden">
                  <Menu className="size-4" />
                  <span className="sr-only">Open navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Back button to easily switch pages */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="h-8 rounded-xl px-2.5 text-xs font-medium text-foreground/80 hover:text-foreground hover:bg-accent/60 cursor-pointer gap-1.5 shrink-0"
              title="Go back to previous page"
            >
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Authority Control Center</p>
              <p className="truncate text-xs text-muted-foreground">
                Vijayawada Municipal Corporation · 34 circles
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="icon" className="relative rounded-xl">
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
              <span className="sr-only">Alerts</span>
            </Button>
            <Avatar className="size-9">
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                AK
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
