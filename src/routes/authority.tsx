import { createFileRoute } from "@tanstack/react-router";
import { AuthorityLayout } from "@/components/civic/AuthorityLayout";

export const Route = createFileRoute("/authority")({
  component: AuthorityLayout,
});
