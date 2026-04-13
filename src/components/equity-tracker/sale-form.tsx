import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saleSchema, type SaleFormData } from "@/lib/equity-tracker/schemas";
import { createSale, updateSale } from "@/lib/equity-tracker/server-fns";
import { formatCurrency, formatShares, formatDate, formatDateShort, isLongTermHolding, isIsoQualifyingDisposition } from "@/lib/equity-tracker/utils";
import type { Sale, Lot } from "@/lib/equity-tracker/types";
import { Badge } from "@/components/ui/badge";

interface SaleFormProps {
  open: boolean;
  onClose: () => void;
  grantId: string;
  strikePrice: number;
  lots: Lot[];
  sale?: Sale | null;
}

export function SaleForm({
  open,
  onClose,
  grantId,
  strikePrice,
  lots,
  sale,
}: SaleFormProps) {
  const router = useRouter();
  const isEdit = !!sale;

  const availableLots = lots.filter((l) => l.sharesRemaining > 0 || (isEdit && l.exerciseId === sale?.exerciseId));

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      grantId,
      exerciseId: "",
      referenceId: "",
      saleDate: "",
      shares: 0,
      salePrice: 0,
      costBasisPerShare: strikePrice,
      isLongTerm: false,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        grantId,
        exerciseId: sale?.exerciseId ?? "",
        referenceId: sale?.referenceId ?? "",
        saleDate: sale?.saleDate ?? new Date().toISOString().split("T")[0],
        shares: sale?.shares ?? 0,
        salePrice: sale?.salePrice ?? 0,
        costBasisPerShare: sale?.costBasisPerShare ?? strikePrice,
        isLongTerm: sale?.isLongTerm ?? false,
        notes: sale?.notes ?? "",
      });
    }
  }, [open, sale]);

  const selectedExerciseId = form.watch("exerciseId");
  const selectedLot = lots.find((l) => l.exerciseId === selectedExerciseId);
  const saleDate = form.watch("saleDate");
  const maxShares = selectedLot
    ? selectedLot.sharesRemaining + (isEdit && sale?.exerciseId === selectedExerciseId ? sale.shares : 0)
    : 0;

  // Derive cost basis and holding period from lot + sale date
  const costBasisPerShare = selectedLot?.costBasis ?? strikePrice;
  const longTerm = selectedLot && saleDate
    ? isLongTermHolding(selectedLot.exerciseDate, saleDate)
    : false;
  const isIso = selectedLot?.grantType === "iso";
  const qualifying = isIso && selectedLot && saleDate
    ? isIsoQualifyingDisposition(selectedLot.grantDate, selectedLot.exerciseDate, saleDate)
    : null;

  const shares = form.watch("shares") || 0;
  const salePrice = form.watch("salePrice") || 0;
  const proceeds = shares * salePrice;
  const totalCost = shares * costBasisPerShare;
  const gainLoss = proceeds - totalCost;

  const onSubmit = async (data: SaleFormData) => {
    if (!data.exerciseId) {
      toast.error("Select an exercise lot");
      return;
    }
    if (data.shares > maxShares) {
      toast.error(`Only ${formatShares(maxShares)} shares available from this lot`);
      return;
    }
    try {
      const payload = {
        ...data,
        costBasisPerShare,
        isLongTerm: longTerm,
      };
      if (isEdit) {
        await updateSale({
          data: {
            id: sale.id,
            exerciseId: payload.exerciseId || undefined,
            referenceId: payload.referenceId || undefined,
            saleDate: payload.saleDate,
            shares: payload.shares,
            salePrice: payload.salePrice,
            costBasisPerShare: payload.costBasisPerShare,
            isLongTerm: payload.isLongTerm,
            notes: payload.notes || undefined,
          },
        });
        toast.success("Sale updated");
      } else {
        await createSale({ data: payload });
        toast.success(`Sold ${formatShares(data.shares)} shares`);
      }
      router.invalidate();
      onClose();
    } catch (err) {
      console.error("Sale error:", err);
      toast.error(isEdit ? "Failed to update sale" : "Failed to log sale");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Sale" : "Log Sale"}</DialogTitle>
          <DialogDescription>
            Select an exercise lot to sell from.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Lot picker */}
          <div className="space-y-1.5">
            <Label>Exercise lot</Label>
            {availableLots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shares available to sell. Exercise shares first.</p>
            ) : (
              <Select
                value={selectedExerciseId || ""}
                onValueChange={(v) => form.setValue("exerciseId", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a lot..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLots.map((lot) => (
                    <SelectItem key={lot.exerciseId} value={lot.exerciseId}>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {lot.referenceId && <span>{lot.referenceId}</span>}
                        <span>{formatDateShort(lot.exerciseDate)}</span>
                        <span>{formatShares(lot.sharesRemaining)} avail</span>
                        <span>@ {formatCurrency(lot.costBasis)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedLot && (
            <>
              {/* Lot info */}
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span>
                    <span className="text-muted-foreground">Exercised:</span>{" "}
                    <span className="font-medium">{formatDate(selectedLot.exerciseDate)}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Cost basis:</span>{" "}
                    <span className="font-medium">{formatCurrency(costBasisPerShare)}/share</span>
                  </span>
                </div>
                {saleDate && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      longTerm
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-orange-300 bg-orange-50 text-orange-700"
                    }`}
                  >
                    {longTerm ? "Long-term" : "Short-term"}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="saleRefId">Reference ID (optional)</Label>
                <Input id="saleRefId" placeholder="e.g., SALE-2024-001" {...form.register("referenceId")} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="saleDate">Sale date</Label>
                  <Input id="saleDate" type="date" {...form.register("saleDate")} />
                  {form.formState.errors.saleDate && (
                    <p className="text-xs text-destructive">{form.formState.errors.saleDate.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="saleShares">Shares</Label>
                  <Input
                    id="saleShares"
                    type="number"
                    step="1"
                    min="1"
                    max={maxShares}
                    {...form.register("shares", { valueAsNumber: true })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Max: {formatShares(maxShares)} from this lot
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="salePrice">Sale price per share</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.0001"
                    min="0"
                    className="pl-7"
                    {...form.register("salePrice", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="saleNotes">Notes (optional)</Label>
                <Input id="saleNotes" placeholder="e.g., Partial lot sale" {...form.register("notes")} />
              </div>

              {shares > 0 && salePrice > 0 && (
                <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Proceeds</span>
                    <span className="font-medium">{formatCurrency(proceeds)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost basis</span>
                    <span className="font-medium">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-1 mt-1">
                    <span className="text-muted-foreground">
                      {gainLoss >= 0 ? "Capital gain" : "Capital loss"}
                      {longTerm ? " (long-term)" : " (short-term)"}
                    </span>
                    <span className={`font-semibold ${gainLoss >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {formatCurrency(gainLoss)}
                    </span>
                  </div>
                  {isIso && qualifying !== null && (
                    <div className={`pt-1.5 border-t border-border mt-1.5 text-xs ${qualifying ? "text-green-600" : "text-amber-700"}`}>
                      {qualifying
                        ? "Qualifying disposition — entire gain taxed as long-term capital gain."
                        : "Disqualifying disposition — spread at exercise will be taxed as ordinary income."}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update Sale" : "Log Sale"}
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
