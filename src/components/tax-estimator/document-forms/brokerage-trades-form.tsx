import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brokerageTradesSchema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/tax-estimator/format";

type FormData = z.infer<typeof brokerageTradesSchema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onDelete?: () => void;
}

function isLongTerm(buyDate: string, sellDate: string): boolean {
  if (!buyDate || !sellDate) return false;
  const buy = new Date(buyDate + "T12:00:00");
  const sell = new Date(sellDate + "T12:00:00");
  const diffMs = sell.getTime() - buy.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 365;
}

function getQuarter(dateStr: string): string {
  if (!dateStr) return "";
  const month = new Date(dateStr + "T12:00:00").getMonth();
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

export function BrokerageTradesForm({ defaultValues, onSubmit, onDelete }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(brokerageTradesSchema),
    defaultValues: {
      trades: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "trades",
  });

  const watchedTrades = form.watch("trades");

  // Summary
  let totalShortTermGain = 0;
  let totalLongTermGain = 0;
  for (const t of watchedTrades ?? []) {
    if (!t.shares || !t.sellPrice || !t.buyPrice) continue;
    const gain = (t.sellPrice - t.buyPrice) * t.shares;
    if (isLongTerm(t.buyDate, t.sellDate)) {
      totalLongTermGain += gain;
    } else {
      totalShortTermGain += gain;
    }
  }
  const totalGain = totalShortTermGain + totalLongTermGain;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {fields.length > 0 && (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const trade = watchedTrades?.[index];
            const lt = trade ? isLongTerm(trade.buyDate, trade.sellDate) : false;
            const quarter = trade ? getQuarter(trade.sellDate) : "";
            const gain = trade && trade.shares && trade.sellPrice && trade.buyPrice
              ? (trade.sellPrice - trade.buyPrice) * trade.shares
              : 0;

            return (
              <div key={field.id} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Trade {index + 1}</span>
                    {trade?.sellDate && (
                      <Badge variant="secondary" className="text-xs">
                        {lt ? "Long-term" : "Short-term"}
                      </Badge>
                    )}
                    {quarter && (
                      <Badge variant="outline" className="text-xs">{quarter}</Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => remove(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Ticker / Symbol</Label>
                    <Input
                      placeholder="e.g. AAPL"
                      className="uppercase"
                      {...form.register(`trades.${index}.ticker`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Shares sold</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      {...form.register(`trades.${index}.shares`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Gain/Loss
                    </Label>
                    <div className={`flex items-center h-9 px-3 text-sm font-medium rounded-md border border-border bg-secondary/50 ${gain >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {gain !== 0 ? formatCurrency(gain, true) : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Date bought</Label>
                    <Input type="date" {...form.register(`trades.${index}.buyDate`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Date sold</Label>
                    <Input type="date" {...form.register(`trades.${index}.sellDate`)} />
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Buy price (per share)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        {...form.register(`trades.${index}.buyPrice`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Sell price (per share)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        {...form.register(`trades.${index}.sellPrice`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ ticker: "", shares: 0, buyDate: "", sellDate: "", buyPrice: 0, sellPrice: 0 })}
      >
        <Plus className="mr-1 size-3.5" />
        Add Trade
      </Button>

      {/* Summary */}
      {fields.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Short-term gains/losses</span>
            <span className={totalShortTermGain >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
              {formatCurrency(totalShortTermGain)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Long-term gains/losses</span>
            <span className={totalLongTermGain >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
              {formatCurrency(totalLongTermGain)}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="font-medium">Net gain/loss</span>
            <span className={`font-semibold ${totalGain >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatCurrency(totalGain)}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
        {onDelete && (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
