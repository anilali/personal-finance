import { useState, useRef, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateVestEvent, deleteVestEvent } from "@/lib/equity-tracker/server-fns";
import type { VestEvent } from "@/lib/equity-tracker/types";
import { formatShares, formatDate } from "@/lib/equity-tracker/utils";

interface VestingTableProps {
  vestEvents: VestEvent[];
  separationDate?: string | null;
}

type EditingCell = {
  id: string;
  field: "vestDate" | "shares";
  value: string;
};

export function VestingTable({ vestEvents, separationDate }: VestingTableProps) {
  const router = useRouter();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell) inputRef.current?.focus();
  }, [editingCell]);

  if (vestEvents.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No vest events generated.
      </p>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const normalizedSepDate = separationDate?.includes("T") ? separationDate.split("T")[0] : separationDate;

  const startEdit = (event: VestEvent, field: "vestDate" | "shares") => {
    setEditingCell({
      id: event.id,
      field,
      value: field === "shares" ? String(event.shares) : event.vestDate,
    });
  };

  const save = async () => {
    if (!editingCell) return;
    const { id, field, value } = editingCell;
    const original = vestEvents.find((e) => e.id === id);
    if (!original) return;

    // Check if value actually changed
    const originalValue = field === "shares" ? String(original.shares) : original.vestDate;
    if (value === originalValue) {
      setEditingCell(null);
      return;
    }

    if (field === "shares") {
      const num = Number(value);
      if (isNaN(num) || num <= 0) {
        toast.error("Enter a valid share count");
        return;
      }
      try {
        await updateVestEvent({ data: { id, shares: num } });
        toast.success("Shares updated");
      } catch {
        toast.error("Failed to update");
      }
    } else {
      if (!value) {
        toast.error("Enter a valid date");
        return;
      }
      try {
        await updateVestEvent({ data: { id, vestDate: value } });
        toast.success("Date updated");
      } catch {
        toast.error("Failed to update");
      }
    }

    setEditingCell(null);
    router.invalidate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setEditingCell(null);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            <th className="w-40 px-4 py-2.5 text-left font-medium text-muted-foreground">Date</th>
            <th className="w-28 px-4 py-2.5 text-right font-medium text-muted-foreground">Shares</th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Status</th>
            <th className="w-10 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {vestEvents.map((event) => {
            const isPast = event.vestDate <= today;
            const isOverdue = isPast && event.status === "scheduled";
            const isForfeited = event.status === "forfeited" || !!(normalizedSepDate && event.status === "scheduled" && event.vestDate > normalizedSepDate);
            const isEditingDate = editingCell?.id === event.id && editingCell.field === "vestDate";
            const isEditingShares = editingCell?.id === event.id && editingCell.field === "shares";

            return (
              <tr key={event.id} className={`border-b border-border last:border-b-0 ${isForfeited ? "opacity-50" : ""}`}>
                <td
                  className="px-4 py-2.5 cursor-text hover:bg-secondary/50 transition-colors"
                  onClick={() => !isEditingDate && startEdit(event, "vestDate")}
                >
                  {isEditingDate ? (
                    <Input
                      ref={inputRef}
                      type="date"
                      value={editingCell.value}
                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                      onBlur={save}
                      onKeyDown={handleKeyDown}
                      className="h-7 w-full max-w-32 text-sm -my-1"
                    />
                  ) : (
                    formatDate(event.vestDate)
                  )}
                </td>
                <td
                  className="px-4 py-2.5 text-right tabular-nums cursor-text hover:bg-secondary/50 transition-colors"
                  onClick={() => !isEditingShares && startEdit(event, "shares")}
                >
                  {isEditingShares ? (
                    <Input
                      ref={inputRef}
                      type="number"
                      step="1"
                      min="1"
                      value={editingCell.value}
                      onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                      onBlur={save}
                      onKeyDown={handleKeyDown}
                      className="h-7 w-full max-w-24 ml-auto text-right text-sm -my-1"
                    />
                  ) : (
                    formatShares(event.shares)
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {event.status === "vested" ? (
                    <Badge variant="secondary" className="text-[10px]">Vested</Badge>
                  ) : isForfeited ? (
                    <Badge className="text-[10px] border-amber-300 bg-amber-50 text-amber-700">Forfeited</Badge>
                  ) : isOverdue ? (
                    <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Scheduled</Badge>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <button
                    onClick={async () => {
                      try {
                        await deleteVestEvent({ data: { id: event.id } });
                        toast.success("Vest event deleted");
                        router.invalidate();
                      } catch {
                        toast.error("Failed to delete");
                      }
                    }}
                    className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 [tr:hover_&]:opacity-100"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
