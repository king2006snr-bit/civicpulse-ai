import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "civicpulse_theme_mode";

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // fallback
  }
  return getSystemTheme();
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

// Global listener for cross-component and cross-tab syncing
const listeners = new Set<() => void>();

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    // Apply current theme on mount
    applyTheme(theme);

    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === "dark" || e.newValue === "light")) {
        setTheme(e.newValue);
        applyTheme(e.newValue);
      }
    };

    const update = () => {
      const current = getStoredTheme();
      setTheme(current);
      applyTheme(current);
    };

    listeners.add(update);
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(update);
      window.removeEventListener("storage", onStorage);
    };
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    listeners.forEach((l) => l());
  };

  return { theme, toggleTheme, isDark: theme === "dark" };
}
