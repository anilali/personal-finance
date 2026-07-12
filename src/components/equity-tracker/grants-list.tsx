import { useNavigate, useRouter } from "@tanstack/react-router";
import { Plus, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { deleteGrant } from "@/lib/equity-tracker/server-fns";
import type { CompanyWithGrants } from "@/lib/equity-tracker/types";
import { formatCurrency, formatShares, formatDate } from "@/lib/equity-tracker/utils";

interface GrantsListProps {
  company: CompanyWithGrants;
  selectedGrantId?: string;
  onAddGrant: () => void;
  onEditCompany: () => void;
}

const STATUS_STYLES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  fully_vested: { label: "Fully Vested", variant: "secondary" },
  expired: { label: "Expired", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

const GRANT_TYPE_LABEL: Record<string, string> = {
  iso: "ISO",
  nso: "NSO",
  rsu: "RSU",
};

export function GrantsList({ company, selectedGrantId, onAddGrant, onEditCompany }: GrantsListProps) {
  const navigate = useNavigate();
  const router = useRouter();

  const handleDeleteGrant = async (e: React.MouseEvent, grantId: string) => {
    e.stopPropagation();
    if (!confirm("Cancel this grant? It will be marked as cancelled.")) return;
    try {
      await deleteGrant({ data: { id: grantId } });
      toast.success("Grant cancelled");
      router.invalidate();
    } catch {
      toast.error("Failed to cancel grant");
    }
  };

  const handleSelectGrant = (grantId: string) => {
    navigate({
      to: "/equity-tracker",
      search: { company: company.id, grant: grantId },
    });
  };

  const activeGrants = company.grants.filter((g) => g.status !== "cancelled");
  const optionGrants = activeGrants.filter((g) => g.grantType === "iso" || g.grantType === "nso");
  const rsuGrants = activeGrants.filter((g) => g.grantType === "rsu");

  const renderGrant = (grant: typeof activeGrants[number]) => {
    const style = STATUS_STYLES[grant.status] ?? STATUS_STYLES.active;
    const spread = company.currentPrice != null
      ? Math.max(0, company.currentPrice - grant.strikePrice)
      : null;

    return (
      <button
        key={grant.id}
        onClick={() => handleSelectGrant(grant.id)}
        className={cn(
          "group flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all hover:shadow-md",
          selectedGrantId === grant.id
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-card",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {grant.grantId && (
              <span className="text-sm font-semibold text-foreground">{grant.grantId}</span>
            )}
            <Badge
              className={`text-[10px] ${
                grant.grantType === "iso"
                  ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : grant.grantType === "rsu"
                    ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {GRANT_TYPE_LABEL[grant.grantType]}
            </Badge>
            <Badge variant={style.variant} className="text-[10px]">
              {style.label}
            </Badge>
            <span className="text-sm font-medium">
              {formatShares(grant.totalShares)} shares
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Grant: {formatDate(grant.grantDate)}</span>
            <span>Strike: {formatCurrency(grant.strikePrice)}</span>
            {spread != null && (
              <span>Spread: {formatCurrency(spread)}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {spread != null && (
            <div className="text-right">
              <p className="text-sm font-semibold">
                {formatCurrency(grant.totalShares * spread)}
              </p>
              <p className="text-xs text-muted-foreground">total value</p>
            </div>
          )}
          <button
            onClick={(e) => handleDeleteGrant(e, grant.id)}
            className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
          >
            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Company header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{company.name}</h2>
            {company.ticker && (
              <Badge variant="outline">{company.ticker}</Badge>
            )}
            {!company.isCurrent && (
              <Badge variant="secondary">Former</Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            {company.currentPrice != null && (
              <span>
                <span className="font-semibold">FMV Price:</span> {formatCurrency(company.currentPrice)}
                {company.priceAsOf && ` (as of ${formatDate(company.priceAsOf)})`}
              </span>
            )}
            {!company.isCurrent && company.separationDate && (
              <span><span className="font-semibold">Last day:</span> {formatDate(company.separationDate)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEditCompany}>
            Edit
          </Button>
          <Button size="sm" onClick={onAddGrant}>
            <Plus className="mr-1.5 size-4" />
            Add Grant
          </Button>
        </div>
      </div>

      <Separator />

      {/* Grants */}
      {activeGrants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No grants yet. Add your first option grant to start tracking.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onAddGrant}>
            <Plus className="mr-1.5 size-4" />
            Add Grant
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {optionGrants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Options
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({optionGrants.length})
                </span>
              </div>
              {optionGrants.map(renderGrant)}
            </div>
          )}
          {rsuGrants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  RSUs
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({rsuGrants.length})
                </span>
              </div>
              {rsuGrants.map(renderGrant)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
