import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Plus, Trash2, Calendar, MapPin, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteEstimate } from "@/lib/tax-estimator/server-fns";
import { FILING_STATUS_LABELS } from "@/lib/tax-estimator/tax-data";
import type { Estimate, FilingStatus } from "@/lib/tax-estimator/types";

interface EstimateListProps {
  estimates: Estimate[];
  onSelect: (id: string) => void;
  onNewEstimate: () => void;
}

export function EstimateList({ estimates, onSelect, onNewEstimate }: EstimateListProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteEstimate({ data: { id } });
      toast.success(`Deleted "${name}"`);
      router.invalidate();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Estimates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an estimate to continue or create a new one
          </p>
        </div>
        <Button onClick={onNewEstimate}>
          <Plus className="mr-1 size-4" />
          New Estimate
        </Button>
      </div>

      {estimates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No estimates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first estimate to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {estimates.map((est) => (
            <button
              key={est.id}
              type="button"
              onClick={() => onSelect(est.id)}
              className="group relative rounded-xl border border-border bg-white p-5 text-left transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{est.name}</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(est.id, est.name);
                    }}
                    disabled={deleting === est.id}
                    className="rounded-md p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    {est.taxYear}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {est.state}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {FILING_STATUS_LABELS[est.filingStatus as FilingStatus]}
                  </Badge>
                  <Badge
                    variant={est.estimateType === "quarterly" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {est.estimateType === "quarterly" ? (
                      <><Clock className="mr-1 size-3" />Q{est.currentQuarter}</>
                    ) : (
                      "Year-end"
                    )}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
