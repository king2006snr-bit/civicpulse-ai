import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import "./styles.css";

// Early theme initialization to prevent theme flash
if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem("civicpulse_theme_mode");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch {
    // ignore
  }
}

// Google Maps Platform early quota and auth failure interceptor
if (typeof window !== "undefined") {
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
  };
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    origError.apply(console, args);
    const msg = args.map((a) => String(a)).join(" ");
    if (msg.includes("OverQuotaMapError") || msg.includes("QuotaExceededError")) {
      window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
    }
  };
}

const router = getRouter();

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}
