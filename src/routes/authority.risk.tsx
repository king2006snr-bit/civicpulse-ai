import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Compatibility route kept for older links/bookmarks.
 * Risk analysis now lives on the Predictions page.
 */
export const Route = createFileRoute("/authority/risk")({
  beforeLoad: () => {
    throw redirect({ to: "/authority/predictions" });
  },
});
