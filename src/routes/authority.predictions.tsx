import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/civic/PageHeader";
import { StatCard } from "@/components/civic/StatCard";
import { healthForecast } from "@/lib/mock-data";
import { usePredictions } from "@/lib/predictions-store";

export const Route = createFileRoute("/authority/predictions")({
  head: () => ({
    meta: [
      { title: "Predictions — CivicPulse AI" },
      {
        name: "description",
        content:
          "Forecasted failure windows, probabilities and repair cost estimates for at-risk city assets.",
      },
      { property: "og:title", content: "Predictions — CivicPulse AI" },
      {
        property: "og:description",
        content: "Which assets fail next, when, and what the repair is likely to cost.",
      },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const { data, error, loading, recompute } = usePredictions();
  const rows = data?.predictions ?? [];
  const accuracy = data?.model?.risk_level?.accuracy;

  return (
    <>
      <PageHeader
        title="Predictions"
        description="Model output comparing do-nothing degradation against the planned repair programme."
        actions={
          <Button
            className="rounded-xl cursor-pointer"
            onClick={async () => {
              try {
                const result = await recompute();
                toast.success("Forecast model re-calculated", {
                  description: `Re-scored ${result.summary.assets_scored} assets from live complaint and infrastructure data.`,
                });
              } catch (e) {
                toast.error("Prediction failed", { description: (e as Error).message });
              }
            }}
          >
            Re-run forecast
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Model accuracy"
          value={typeof accuracy === "number" ? `${Math.round(accuracy * 100)}%` : "—"}
          {...(data?.model?.n_samples
            ? { delta: `cross-validated, ${data.model.n_samples} records` }
            : {})}
        />
        <StatCard
          label="Assets at risk (90d)"
          value={data ? String(data.summary.at_risk_count) : "—"}
        />
        <StatCard label="Forecast spend" value="—" />
        <StatCard label="Avoided cost" value="—" />
      </div>

      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">City health forecast (6 months)</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={healthForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[40, 90]} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="baseline"
                name="No action"
                stroke="var(--color-chart-5)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="withRepairs"
                name="With planned repairs"
                stroke="var(--color-chart-2)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Predicted failures</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Failure window</TableHead>
                <TableHead className="min-w-[160px]">Probability</TableHead>
                <TableHead>Est. cost</TableHead>
                <TableHead>Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    {loading
                      ? "Loading model predictions…"
                      : error
                        ? `Predictions unavailable: ${error}`
                        : "No infrastructure assets to score yet."}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((p) => (
                <TableRow key={p.infrastructure_id}>
                  <TableCell>
                    <Link
                      to="/authority/infrastructure/$assetId"
                      params={{ assetId: p.infrastructure_id }}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {p.infrastructure_name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {p.infrastructure_id}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.risk_level}</TableCell>
                  <TableCell>
                    <span className="mb-1 block text-xs font-semibold tabular-nums">
                      {Math.round(p.risk_score)}%
                    </span>
                    <Progress value={p.risk_score} className="h-2" />
                  </TableCell>
                  <TableCell className="font-semibold">—</TableCell>
                  <TableCell className="max-w-[320px] text-sm text-muted-foreground">
                    {p.factors.length ? p.factors.join(" · ") : "No major risk drivers identified."}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
