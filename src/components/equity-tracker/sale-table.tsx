import { useRouter } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { deleteSale } from "@/lib/equity-tracker/server-fns";
import type { Sale, Lot, GrantType } from "@/lib/equity-tracker/types";
import { formatCurrency, formatShares, formatDate } from "@/lib/equity-tracker/utils";

interface SaleTableProps {
  sales: Sale[];
  lots: Lot[];
  grantType: GrantType;
  totalProceeds: number;
  totalGainLoss: number;
  onEdit: (sale: Sale) => void;
}

export function SaleTable({
  sales,
  lots,
  grantType,
  totalProceeds,
  totalGainLoss,
  onEdit,
}: SaleTableProps) {
  const router = useRouter();

  if (sales.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No sales logged yet.
      </p>
    );
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSale({ data: { id } });
      toast.success("Sale deleted");
      router.invalidate();
    } catch {
      toast.error("Failed to delete sale");
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Ref</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Lot</th>
              <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
              <th className="w-20 px-4 py-2.5 text-right font-medium text-muted-foreground">Shares</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Proceeds</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Gain/Loss</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Term</th>
              <th className="w-16 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const proceeds = sale.shares * sale.salePrice;
              const cost = sale.shares * sale.costBasisPerShare;
              const gainLoss = proceeds - cost;

              return (
                <tr key={sale.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 text-sm font-medium">{sale.referenceId || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {(() => {
                      const lot = lots.find((l) => l.exerciseId === sale.exerciseId);
                      return lot ? (lot.referenceId || formatDate(lot.exerciseDate)) : "—";
                    })()}
                  </td>
                  <td className="px-4 py-2.5">{formatDate(sale.saleDate)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(sale.shares)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(sale.salePrice)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(proceeds)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${gainLoss >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(gainLoss)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        sale.isLongTerm
                          ? "border-green-300 bg-green-50 text-green-700"
                          : "border-orange-300 bg-orange-50 text-orange-700"
                      }`}
                    >
                      {sale.isLongTerm ? "Long" : "Short"}
                    </Badge>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity [tr:hover_&]:opacity-100">
                      <button
                        onClick={() => onEdit(sale)}
                        className="rounded p-1 hover:bg-secondary"
                      >
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
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

      {/* Totals */}
      <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total proceeds</span>
          <span className="font-semibold">{formatCurrency(totalProceeds)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total gain/loss</span>
          <span className={`font-semibold ${totalGainLoss >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatCurrency(totalGainLoss)}
          </span>
        </div>
        <div className="pt-1.5 border-t border-border mt-1.5">
          <p className="text-xs text-muted-foreground">
            {grantType === "iso"
              ? "ISO: Qualifying disposition requires holding 2 years from grant + 1 year from exercise."
              : "NSO: Capital gains are in addition to ordinary income recognized at exercise."}
          </p>
        </div>
      </div>
    </div>
  );
}
