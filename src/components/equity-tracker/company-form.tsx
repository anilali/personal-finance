import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { companySchema, type CompanyFormData } from "@/lib/equity-tracker/schemas";
import { createCompany, fetchTickerPrice, updateCompany } from "@/lib/equity-tracker/server-fns";
import type { Company } from "@/lib/equity-tracker/types";

interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  company?: Company | null;
}

export function CompanyForm({ open, onClose, company }: CompanyFormProps) {
  const router = useRouter();
  const isEdit = !!company;

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      ticker: "",
      currentPrice: undefined,
      priceAsOf: "",
      isCurrent: true,
      separationDate: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: company?.name ?? "",
        ticker: company?.ticker ?? "",
        currentPrice: company?.currentPrice ?? undefined,
        priceAsOf: company?.priceAsOf ?? "",
        isCurrent: company?.isCurrent ?? true,
        separationDate: company?.separationDate ?? "",
      });
    }
  }, [open, company]);

  const isCurrent = form.watch("isCurrent");
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const lastFetchedTicker = useRef<string>("");

  const handleTickerBlur = async () => {
    const ticker = form.getValues("ticker")?.trim().toUpperCase();
    if (!ticker) return;
    if (ticker === lastFetchedTicker.current) return;
    lastFetchedTicker.current = ticker;

    setIsFetchingPrice(true);
    try {
      const { price, asOf } = await fetchTickerPrice({ data: { ticker } });
      form.setValue("currentPrice", price, { shouldValidate: true, shouldDirty: true });
      form.setValue("priceAsOf", asOf, { shouldValidate: true, shouldDirty: true });
      toast.success(`Fetched ${ticker}: $${price.toFixed(2)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch price";
      toast.error(msg);
      lastFetchedTicker.current = "";
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      if (isEdit) {
        await updateCompany({
          data: {
            id: company.id,
            name: data.name,
            ticker: data.ticker || undefined,
            currentPrice: data.currentPrice,
            priceAsOf: data.priceAsOf || undefined,
            isCurrent: data.isCurrent,
            separationDate: data.isCurrent ? undefined : data.separationDate || undefined,
          },
        });
        toast.success("Company updated");
      } else {
        await createCompany({
          data: {
            name: data.name,
            ticker: data.ticker || undefined,
            currentPrice: data.currentPrice,
            priceAsOf: data.priceAsOf || undefined,
            isCurrent: data.isCurrent,
            separationDate: data.isCurrent ? undefined : data.separationDate || undefined,
          },
        });
        toast.success("Company added");
      }
      router.invalidate();
      onClose();
    } catch {
      toast.error(isEdit ? "Failed to update company" : "Failed to add company");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update company details and share price."
              : "Add a company to track equity grants for."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Company name</Label>
            <Input id="name" placeholder="Acme Corp" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ticker">Ticker (optional)</Label>
              <Input
                id="ticker"
                placeholder="ACME"
                {...form.register("ticker", {
                  onBlur: handleTickerBlur,
                })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentPrice" className="flex items-center gap-1.5">
                FMV Price
                {isFetchingPrice && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="currentPrice"
                  type="number"
                  step="0.0001"
                  min="0"
                  className="pl-7"
                  {...form.register("currentPrice", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priceAsOf">Price as of (date)</Label>
            <Input id="priceAsOf" type="date" {...form.register("priceAsOf")} />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              className="size-4 rounded border-border"
              {...form.register("isCurrent")}
            />
            <Label htmlFor="isCurrent" className="text-sm font-normal">
              Current employer
            </Label>
          </div>

          {!isCurrent && (
            <div className="space-y-1.5">
              <Label htmlFor="separationDate">Last day</Label>
              <Input id="separationDate" type="date" {...form.register("separationDate")} />
              <p className="text-[11px] text-muted-foreground">
                Vest events after this date can be identified as forfeited
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : isEdit ? "Update" : "Add Company"}
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
