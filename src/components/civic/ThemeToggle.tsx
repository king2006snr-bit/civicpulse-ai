import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className={cn(
        "rounded-xl border-border bg-card/80 hover:bg-accent/60 cursor-pointer text-xs font-medium gap-2 h-9 px-3 transition-colors",
        className,
      )}
      title={isDark ? "Switch to day/light mode" : "Switch to night/dark monitoring mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
      )}
      {showLabel && <span>{isDark ? "Night Mode (Active)" : "Day Mode"}</span>}
    </Button>
  );
}
