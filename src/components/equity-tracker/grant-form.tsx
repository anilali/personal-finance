import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { grantSchema, type GrantFormData } from "@/lib/equity-tracker/schemas";
import { createGrant, updateGrant } from "@/lib/equity-tracker/server-fns";
import type { Grant } from "@/lib/equity-tracker/types";

interface GrantFormProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  grant?: Grant | null;
  onCreated?: (grantId: string) => void;
}

export function GrantForm({ open, onClose, companyId, grant, onCreated }: GrantFormProps) {
  const router = useRouter();
  const isEdit = !!grant;

  const form = useForm<GrantFormData>({
    resolver: zodResolver(grantSchema),
    defaultValues: {
      companyId,
      grantId: "",
      grantType: "iso",
      grantDate: "",
      totalShares: 0,
      strikePrice: 0,
      grantPrice: undefined,
      expirationDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        companyId,
        grantId: grant?.grantId ?? "",
        grantType: grant?.grantType ?? "iso",
        grantDate: grant?.grantDate ?? "",
        totalShares: grant?.totalShares ?? 0,
        strikePrice: grant?.strikePrice ?? 0,
        grantPrice: grant?.grantPrice ?? undefined,
        expirationDate: grant?.expirationDate ?? "",
        notes: grant?.notes ?? "",
      });
    }
  }, [open, grant]);

  const grantType = form.watch("grantType");
  const isRsu = grantType === "rsu";

  const onSubmit = async (data: GrantFormData) => {
    try {
      if (isEdit) {
        await updateGrant({
          data: {
            id: grant.id,
            grantId: data.grantId || undefined,
            grantType: data.grantType,
            grantDate: data.grantDate,
            totalShares: data.totalShares,
            strikePrice: data.strikePrice,
            grantPrice: data.grantPrice,
            expirationDate: data.expirationDate || undefined,
            notes: data.notes || undefined,
          },
        });
        toast.success("Grant updated");
      } else {
        const created = await createGrant({ data });
        toast.success("Grant created");
        onCreated?.(created.id);
      }
      router.invalidate();
      onClose();
    } catch (err) {
      console.error("Grant save error:", err);
      toast.error(isEdit ? "Failed to update grant" : "Failed to create grant");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Grant" : "Add Grant"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update grant details."
              : "Add a new grant. You can set up the vesting schedule after creating it."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grantId">Grant ID (optional)</Label>
            <Input id="grantId" placeholder="e.g., G-001234" {...form.register("grantId")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Grant type</Label>
              <Select
                value={grantType}
                onValueChange={(v) => form.setValue("grantType", v as "iso" | "nso" | "rsu")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iso">ISO</SelectItem>
                  <SelectItem value="nso">NSO</SelectItem>
                  <SelectItem value="rsu">RSU</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="grantDate">Grant date</Label>
              <Input id="grantDate" type="date" {...form.register("grantDate")} />
              {form.formState.errors.grantDate && (
                <p className="text-xs text-destructive">{form.formState.errors.grantDate.message}</p>
              )}
            </div>
          </div>

          <div className={`grid gap-4 ${isRsu ? "grid-cols-1" : "grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label htmlFor="totalShares">{isRsu ? "Total units" : "Total shares"}</Label>
              <Input
                id="totalShares"
                type="number"
                step="1"
                min="1"
                {...form.register("totalShares", { valueAsNumber: true })}
              />
              {form.formState.errors.totalShares && (
                <p className="text-xs text-destructive">{form.formState.errors.totalShares.message}</p>
              )}
            </div>

            {!isRsu && (
              <div className="space-y-1.5">
                <Label htmlFor="strikePrice">Strike price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="strikePrice"
                    type="number"
                    step="0.0001"
                    min="0"
                    className="pl-7"
                    {...form.register("strikePrice", { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}
          </div>

          {!isRsu && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="grantPrice">FMV at grant (optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id="grantPrice"
                    type="number"
                    step="0.0001"
                    min="0"
                    className="pl-7"
                    {...form.register("grantPrice", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expirationDate">Expiration date</Label>
                <Input id="expirationDate" type="date" {...form.register("expirationDate")} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" placeholder="e.g., Initial hire grant" {...form.register("notes")} />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Saving..."
                : isEdit
                  ? "Update Grant"
                  : "Create Grant"}
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
