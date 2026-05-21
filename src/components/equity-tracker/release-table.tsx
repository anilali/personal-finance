import { useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRelease } from "@/lib/equity-tracker/server-fns";
import type { Release } from "@/lib/equity-tracker/types";
import { formatCurrency, formatShares, formatDate } from "@/lib/equity-tracker/utils";

interface ReleaseTableProps {
  releases: Release[];
}

export function ReleaseTable({ releases }: ReleaseTableProps) {
  const router = useRouter();

  if (releases.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No releases yet.
      </p>
    );
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this release? Any linked sales will be unlinked.")) return;
    try {
      await deleteRelease({ data: { id } });
      toast.success("Release deleted");
      router.invalidate();
    } catch {
      toast.error("Failed to delete release");
    }
  };

  const totalReleased = releases.reduce((s, r) => s + r.sharesReleased, 0);
  const totalReceived = releases.reduce((s, r) => s + r.sharesReceived, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Ref</th>
              <th className="w-32 px-4 py-2.5 text-left font-medium text-muted-foreground">Release Date</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Released</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Received</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Withheld</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">FMV</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {releases.map((r) => {
              const withheld = r.sharesReleased - r.sharesReceived;
              return (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{r.referenceId || "—"}</td>
                  <td className="px-4 py-2.5">{formatDate(r.releaseDate)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(r.sharesReleased)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatShares(r.sharesReceived)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatShares(withheld)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {r.fmvAtRelease != null ? formatCurrency(r.fmvAtRelease) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => handleDelete(r.id)}
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
              <td colSpan={2} className="px-4 py-2 text-xs text-muted-foreground">{releases.length} release{releases.length === 1 ? "" : "s"}</td>
              <td className="px-4 py-2 text-right text-xs tabular-nums">{formatShares(totalReleased)}</td>
              <td className="px-4 py-2 text-right text-xs tabular-nums">{formatShares(totalReceived)}</td>
              <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">{formatShares(totalReleased - totalReceived)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
