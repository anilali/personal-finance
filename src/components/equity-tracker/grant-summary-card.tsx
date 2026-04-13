import { Badge } from "@/components/ui/badge";
import type { GrantSummary } from "@/lib/equity-tracker/types";
import { formatCurrency, formatShares } from "@/lib/equity-tracker/utils";

interface GrantSummaryCardProps {
  summary: GrantSummary;
  daysToExpiration?: number | null;
}

export function GrantSummaryCard({ summary, daysToExpiration }: GrantSummaryCardProps) {
  const isUnderwater = summary.currentSpread <= 0 && summary.totalShares > 0;
  const expiringWarning = daysToExpiration != null && daysToExpiration <= 90 && daysToExpiration > 0;

  return (
    <div className="space-y-4">
      {summary.isExpired && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          These options have expired and can no longer be exercised.
        </div>
      )}

      {isUnderwater && !summary.isExpired && (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          These options are currently underwater (strike price exceeds current share price).
        </div>
      )}

      {expiringWarning && !summary.isExpired && (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Expiring in {daysToExpiration} days — review your exercise options.
        </div>
      )}

      <div className={`grid grid-cols-2 gap-4 ${summary.forfeitedShares > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        <SplitCard label="Total Units" value={formatShares(summary.totalShares)} />
        <SplitCard
          label="Vested"
          primary={formatShares(summary.vestedShares)}
          secondary={summary.isFullyVested ? undefined : `${formatShares(summary.unvestedShares)} unvested`}
          badge={summary.isFullyVested ? "Fully vested" : undefined}
        />
        <SplitCard
          label="Exercised"
          primary={formatShares(summary.exercisedShares)}
          secondary={summary.exercisableShares > 0 ? `${formatShares(summary.exercisableShares)} exercisable` : undefined}
          badge={summary.exercisedShares > 0 && summary.exercisableShares === 0 ? "Fully exercised" : undefined}
        />
        <SplitCard
          label="Sold"
          primary={formatShares(summary.soldShares)}
          secondary={summary.heldShares > 0 ? `${formatShares(summary.heldShares)} held` : undefined}
          badge={summary.soldShares > 0 && summary.heldShares === 0 ? "All sold" : undefined}
        />
        {summary.forfeitedShares > 0 && (
          <SplitCard
            label="Forfeited"
            value={formatShares(summary.forfeitedShares)}
            variant="amber"
          />
        )}
      </div>

      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">Potential value of remaining options</p>
        <p className="text-lg font-semibold">{formatCurrency(summary.totalValue)}</p>
      </div>
    </div>
  );
}

function SplitCard({
  label,
  value,
  primary,
  secondary,
  badge,
  muted,
  variant,
}: {
  label: string;
  value?: string;
  primary?: string;
  secondary?: string;
  badge?: string;
  muted?: boolean;
  variant?: "amber";
}) {
  const borderClass = variant === "amber" ? "border-amber-200" : "border-border";
  const bgClass = variant === "amber" ? "bg-amber-50/50" : "bg-white";
  const valueClass = variant === "amber" ? "text-amber-600/70" : muted ? "text-muted-foreground" : "";
  const labelClass = variant === "amber" ? "text-amber-500/70" : "text-muted-foreground";

  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <p className={`text-xs font-medium ${labelClass}`}>{label}</p>
      {value ? (
        <p className={`mt-1 text-base font-semibold ${valueClass}`}>{value}</p>
      ) : (
        <>
          <p className="mt-1 text-base font-semibold">{primary}</p>
          {secondary && (
            <p className="mt-0.5 text-xs text-muted-foreground">{secondary}</p>
          )}
        </>
      )}
      {badge && (
        <Badge variant="secondary" className="mt-1 text-[10px]">
          {badge}
        </Badge>
      )}
    </div>
  );
}
