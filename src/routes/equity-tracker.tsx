import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/equity-tracker")({
  component: EquityTrackerPage,
});

function EquityTrackerPage() {
  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-accent shadow-sm">
          <TrendingUp className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Equity Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your stock options, RSUs, and equity grants
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <TrendingUp className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Coming Soon</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Track vesting schedules, exercise windows, and tax implications
            for your ISOs, NSOs, RSUs, and ESPP shares — all in one place.
          </p>
        </div>
      </div>
    </div>
  );
}
