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
import { exerciseSchema, type ExerciseFormData } from "@/lib/equity-tracker/schemas";
import { createExercise, updateExercise } from "@/lib/equity-tracker/server-fns";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatShares, formatDate } from "@/lib/equity-tracker/utils";
import type { Exercise } from "@/lib/equity-tracker/types";

interface ExerciseFormProps {
  open: boolean;
  onClose: () => void;
  grantId: string;
  strikePrice: number;
  currentPrice: number | null;
  exercisableShares: number;
  exercise?: Exercise | null;
}

export function ExerciseForm({
  open,
  onClose,
  grantId,
  strikePrice,
  currentPrice,
  exercisableShares,
  exercise,
}: ExerciseFormProps) {
  const router = useRouter();
  const isEdit = !!exercise;

  // When editing, allow up to exercisable + the exercise's own shares (since they'd be freed)
  const maxShares = isEdit ? exercisableShares + exercise.shares : exercisableShares;

  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      grantId,
      referenceId: "",
      exerciseDate: "",
      shares: 0,
      exercisePrice: strikePrice,
      fmvAtExercise: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        grantId,
        referenceId: exercise?.referenceId ?? "",
        exerciseDate: exercise?.exerciseDate ?? new Date().toISOString().split("T")[0],
        shares: exercise?.shares ?? 0,
        exercisePrice: exercise?.exercisePrice ?? strikePrice,
        fmvAtExercise: exercise?.fmvAtExercise ?? (currentPrice ?? 0),
        unvestedShares: exercise?.unvestedShares ?? 0,
        filed83b: exercise?.filed83b ?? false,
        filed83bDate: exercise?.filed83bDate ?? "",
        notes: exercise?.notes ?? "",
      });
    }
  }, [open, exercise]);

  const shares = form.watch("shares") || 0;
  const unvestedShares = form.watch("unvestedShares") || 0;
  const filed83b = form.watch("filed83b");
  const exerciseDate = form.watch("exerciseDate");
  const fmv = form.watch("fmvAtExercise") || 0;
  const costBasis = shares * strikePrice;
  const spreadAtExercise = shares * Math.max(0, fmv - strikePrice);

  // 83(b) deadline: 30 days from exercise date
  const deadline83b = exerciseDate
    ? (() => {
        const d = new Date(exerciseDate + "T12:00:00");
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
      })()
    : null;
  const today = new Date().toISOString().split("T")[0];
  const deadlinePassed = deadline83b ? today > deadline83b : false;

  const onSubmit = async (data: ExerciseFormData) => {
    if (data.shares > maxShares) {
      toast.error(`Only ${formatShares(maxShares)} shares are exercisable`);
      return;
    }
    try {
      const payload = {
        ...data,
        exercisePrice: strikePrice,
        unvestedShares: data.unvestedShares || 0,
        filed83b: data.unvestedShares && data.unvestedShares > 0 ? data.filed83b : false,
        filed83bDate: data.unvestedShares && data.unvestedShares > 0 && data.filed83b ? data.filed83bDate : undefined,
      };
      if (isEdit) {
        await updateExercise({
          data: {
            id: exercise.id,
            referenceId: payload.referenceId || undefined,
            exerciseDate: payload.exerciseDate,
            shares: payload.shares,
            exercisePrice: payload.exercisePrice,
            fmvAtExercise: payload.fmvAtExercise,
            unvestedShares: payload.unvestedShares,
            filed83b: payload.filed83b,
            filed83bDate: payload.filed83bDate,
            notes: payload.notes || undefined,
          },
        });
        toast.success("Exercise updated");
      } else {
        await createExercise({ data: payload });
        toast.success(`Exercised ${formatShares(data.shares)} shares`);
      }
      router.invalidate();
      onClose();
    } catch (err) {
      console.error("Exercise error:", err);
      toast.error(isEdit ? "Failed to update exercise" : "Failed to log exercise");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Exercise" : "Exercise Shares"}</DialogTitle>
          <DialogDescription>
            {formatShares(maxShares)} shares available to exercise at {formatCurrency(strikePrice)} strike
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="referenceId">Reference ID (optional)</Label>
            <Input id="referenceId" placeholder="e.g., EX-2024-001" {...form.register("referenceId")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="exerciseDate">Exercise date</Label>
              <Input id="exerciseDate" type="date" {...form.register("exerciseDate")} />
              {form.formState.errors.exerciseDate && (
                <p className="text-xs text-destructive">{form.formState.errors.exerciseDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shares">Shares</Label>
              <Input
                id="shares"
                type="number"
                step="1"
                min="1"
                max={maxShares}
                {...form.register("shares", { valueAsNumber: true })}
              />
              {form.formState.errors.shares && (
                <p className="text-xs text-destructive">{form.formState.errors.shares.message}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Max: {formatShares(maxShares)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fmvAtExercise">FMV at exercise</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="fmvAtExercise"
                type="number"
                step="0.0001"
                min="0"
                className="pl-7"
                {...form.register("fmvAtExercise", { valueAsNumber: true })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Exercise price: {formatCurrency(strikePrice)} (strike)
            </p>
          </div>

          {/* Early exercise / 83(b) */}
          <div className="space-y-1.5">
            <Label htmlFor="unvestedShares">Unvested shares included (early exercise)</Label>
            <Input
              id="unvestedShares"
              type="number"
              step="1"
              min="0"
              max={shares}
              placeholder="0"
              {...form.register("unvestedShares", { valueAsNumber: true })}
            />
            <p className="text-[11px] text-muted-foreground">
              0 if all exercised shares were already vested
            </p>
          </div>

          {unvestedShares > 0 && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="filed83b"
                  className="size-4 rounded border-border"
                  {...form.register("filed83b")}
                />
                <Label htmlFor="filed83b" className="text-sm font-normal">
                  83(b) election filed
                </Label>
              </div>

              {filed83b ? (
                <div className="space-y-1.5">
                  <Label htmlFor="filed83bDate">Date filed</Label>
                  <Input id="filed83bDate" type="date" {...form.register("filed83bDate")} />
                </div>
              ) : (
                <div className={`text-xs ${deadlinePassed ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>
                  {deadlinePassed
                    ? `Deadline passed (${deadline83b ? formatDate(deadline83b) : ""}). 83(b) must be filed within 30 days of exercise.`
                    : `Must file by ${deadline83b ? formatDate(deadline83b) : ""} (30 days from exercise).`}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="exerciseNotes">Notes (optional)</Label>
            <Input id="exerciseNotes" placeholder="e.g., Partial exercise" {...form.register("notes")} />
          </div>

          {shares > 0 && (
            <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost basis</span>
                <span className="font-medium">{formatCurrency(costBasis)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Spread at exercise</span>
                <span className="font-medium">{formatCurrency(spreadAtExercise)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update Exercise" : "Log Exercise"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
