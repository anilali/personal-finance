import { useRouter } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { deleteExercise } from "@/lib/equity-tracker/server-fns";
import type { Exercise, GrantType } from "@/lib/equity-tracker/types";
import { formatCurrency, formatShares, formatDate } from "@/lib/equity-tracker/utils";

interface ExerciseTableProps {
  exercises: Exercise[];
  grantType: GrantType;
  totalCostBasis: number;
  totalSpreadAtExercise: number;
  onEdit: (exercise: Exercise) => void;
}

export function ExerciseTable({
  exercises,
  grantType,
  totalCostBasis,
  totalSpreadAtExercise,
  onEdit,
}: ExerciseTableProps) {
  const router = useRouter();

  if (exercises.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No exercises logged yet.
      </p>
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExercise({ data: { id } });
      toast.success("Exercise deleted");
      router.invalidate();
    } catch {
      toast.error("Failed to delete exercise");
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Ref</th>
              <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
              <th className="w-24 px-4 py-2.5 text-right font-medium text-muted-foreground">Shares</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">FMV</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Spread</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Cost</th>
              <th className="w-16 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex) => {
              const spread = ex.shares * Math.max(0, ex.fmvAtExercise - ex.exercisePrice);
              const cost = ex.shares * ex.exercisePrice;

              return (
                <tr key={ex.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 text-sm font-medium">{ex.referenceId || "—"}</td>
                  <td className="px-4 py-2.5">{formatDate(ex.exerciseDate)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(ex.shares)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {ex.unvestedShares > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            ex.filed83b
                              ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {ex.filed83b ? "83(b)" : "No 83(b)"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatShares(ex.unvestedShares)} unvested
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Standard</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(ex.fmvAtExercise)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(spread)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(cost)}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity [tr:hover_&]:opacity-100">
                      <button
                        onClick={() => onEdit(ex)}
                        className="rounded p-1 hover:bg-secondary"
                      >
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="rounded p-1 hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals + tax hint */}
      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total cost basis</span>
          <span className="font-semibold">{formatCurrency(totalCostBasis)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total spread at exercise</span>
          <span className="font-semibold">{formatCurrency(totalSpreadAtExercise)}</span>
        </div>
        <div className="pt-1.5 border-t border-border mt-1.5">
          <p className="text-xs text-muted-foreground">
            {grantType === "iso"
              ? "ISO: Spread at exercise is an AMT preference item, not ordinary income."
              : "NSO: Spread at exercise is taxed as ordinary income."}
          </p>
        </div>
      </div>
    </div>
  );
}
