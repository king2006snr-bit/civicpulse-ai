import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/civic/PageHeader";
import { ThemeToggle } from "@/components/civic/ThemeToggle";

export const Route = createFileRoute("/authority/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CivicPulse AI" },
      {
        name: "description",
        content:
          "Configure department profile, alert thresholds, AI scan frequency and notification channels.",
      },
      { property: "og:title", content: "Settings — CivicPulse AI" },
      {
        property: "og:description",
        content: "Department profile, alert thresholds and AI scan preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Control how CivicPulse scans the city and who gets alerted."
        actions={
          <Button
            className="rounded-xl cursor-pointer"
            onClick={() =>
              toast.success("Settings saved successfully", {
                description: "Department profile and AI engine scan preferences updated.",
              })
            }
          >
            Save changes
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/70 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Department profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org">Organisation</Label>
              <Input
                id="org"
                defaultValue="Vijayawada Municipal Corporation"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="officer">Primary officer</Label>
              <Input
                id="officer"
                defaultValue="A. Kulkarni — Chief Engineer (Zone 2)"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact email</Label>
              <Input id="email" defaultValue="engineering@vmc.gov.in" className="rounded-xl" />
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Night-time Monitoring Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Switch between dark night mode and daytime mode for 24/7 command center ops
                </p>
              </div>
              <ThemeToggle showLabel />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tz">Time zone</Label>
              <Select defaultValue="ist">
                <SelectTrigger id="tz" className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ist">Asia/Kolkata (IST)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">AI engine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="freq">Scan frequency</Label>
              <Select defaultValue="6h">
                <SelectTrigger id="freq" className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Every hour</SelectItem>
                  <SelectItem value="6h">Every 6 hours</SelectItem>
                  <SelectItem value="24h">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Critical alert threshold (risk score)</Label>
              <Slider defaultValue={[85]} max={100} step={1} />
              <p className="text-xs text-muted-foreground">
                Assets scoring above this value trigger an immediate alert.
              </p>
            </div>
            <Separator />
            {[
              ["Auto-group duplicate complaints", true],
              ["Include weather data in risk scoring", true],
              ["Auto-assign work orders by ward", false],
            ].map(([label, on]) => (
              <div key={label as string} className="flex items-center justify-between gap-4">
                <span className="min-w-0 text-sm">{label}</span>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-card xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ["Email digest", "Daily summary at 8:00 AM", true],
              ["SMS for critical alerts", "Sent to on-call engineer", true],
              ["Weekly council briefing", "Auto-generated every Monday", false],
              ["Citizen status updates", "Notify reporters on every change", true],
            ].map(([title, desc, on]) => (
              <div
                key={title as string}
                className="flex items-start justify-between gap-4 rounded-xl border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch defaultChecked={on as boolean} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
