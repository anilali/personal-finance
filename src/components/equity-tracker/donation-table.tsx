import { useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDonation } from "@/lib/equity-tracker/server-fns";
import type { Donation, Lot } from "@/lib/equity-tracker/types";
import { formatCurrency, formatShares, formatDate } from "@/lib/equity-tracker/utils";

interface DonationTableProps {
  donations: Donation[];
  lots: Lot[];
}

export function DonationTable({ donations, lots }: DonationTableProps) {
  const router = useRouter();

  if (donations.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No donations recorded.
      </p>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this donation?")) return;
    try {
      await deleteDonation({ data: { id } });
      toast.success("Donation deleted");
      router.invalidate();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const totalShares = donations.reduce((s, d) => s + d.shares, 0);
  const totalDeduction = donations.reduce((s, d) => s + d.shares * d.fmvAtDonation, 0);
  const totalCostBasis = donations.reduce((s, d) => {
    const lot = lots.find((l) => l.id === (d.exerciseId ?? d.releaseId));
    return s + d.shares * (lot?.costBasis ?? 0);
  }, 0);
  const totalAvoidedGain = totalDeduction - totalCostBasis;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Lot</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Shares</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">FMV/share</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Deduction</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Avoided Gain</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => {
              const lot = lots.find((l) => l.id === (d.exerciseId ?? d.releaseId));
              const deduction = d.shares * d.fmvAtDonation;
              const costBasis = d.shares * (lot?.costBasis ?? 0);
              const avoidedGain = deduction - costBasis;
              return (
                <tr key={d.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5">{formatDate(d.donationDate)}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {lot ? (lot.referenceId || formatDate(lot.acquiredDate)) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(d.shares)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(d.fmvAtDonation)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatCurrency(deduction)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-green-600">{formatCurrency(avoidedGain)}</td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 [tr:hover_&]:opacity-100"
                    >
                      <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-secondary/30">
              <td colSpan={2} className="px-4 py-2 text-xs text-muted-foreground">{donations.length} donation{donations.length === 1 ? "" : "s"}</td>
              <td className="px-4 py-2 text-right text-xs tabular-nums">{formatShares(totalShares)}</td>
              <td />
              <td className="px-4 py-2 text-right text-xs tabular-nums font-medium">{formatCurrency(totalDeduction)}</td>
              <td className="px-4 py-2 text-right text-xs tabular-nums text-green-600">{formatCurrency(totalAvoidedGain)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
