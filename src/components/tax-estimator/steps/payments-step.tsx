import { useState, useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { updateEstimate } from "@/lib/tax-estimator/server-fns";
import { formatCurrency } from "@/lib/tax-estimator/format";
import type { EstimateWithDocuments, PaymentEntry } from "@/lib/tax-estimator/types";

interface PaymentsStepProps {
  estimate: EstimateWithDocuments;
}

function getQuarterLabel(dateStr: string): string {
  if (!dateStr) return "";
  const month = new Date(dateStr + "T12:00:00").getMonth();
  if (month < 3) return "Q1";
  if (month < 6) return "Q2";
  if (month < 9) return "Q3";
  return "Q4";
}

export function PaymentsStep({ estimate }: PaymentsStepProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<PaymentEntry[]>(
    estimate.paymentEntries.length > 0
      ? estimate.paymentEntries
      : [],
  );
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = (updated: PaymentEntry[]) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        await updateEstimate({
          data: { id: estimate.id, paymentEntries: updated },
        });
        router.invalidate();
      } catch {
        // silent
      }
    }, 800);
  };

  useEffect(() => () => clearTimeout(saveTimeout.current), []);

  const addEntry = () => {
    const updated = [...entries, { date: "", amount: 0 }];
    setEntries(updated);
  };

  const updateEntry = (index: number, field: keyof PaymentEntry, value: string | number) => {
    const updated = entries.map((e, i) =>
      i === index ? { ...e, [field]: value } : e,
    );
    setEntries(updated);
    save(updated);
  };

  const removeEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    save(updated);
  };

  // Compute quarter totals
  const quarterTotals = { q1: 0, q2: 0, q3: 0, q4: 0 };
  for (const entry of entries) {
    if (!entry.date || !entry.amount) continue;
    const month = new Date(entry.date + "T12:00:00").getMonth();
    if (month < 3) quarterTotals.q1 += entry.amount;
    else if (month < 6) quarterTotals.q2 += entry.amount;
    else if (month < 9) quarterTotals.q3 += entry.amount;
    else quarterTotals.q4 += entry.amount;
  }
  const totalPayments = quarterTotals.q1 + quarterTotals.q2 + quarterTotals.q3 + quarterTotals.q4;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Estimated Payments Made</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter any estimated tax payments you've sent to the IRS for {estimate.taxYear}
        </p>
      </div>

      {/* Payment entries */}
      <div className="space-y-3 max-w-lg">
        {entries.map((entry, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="grid grid-cols-[160px_140px] gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Date paid
                  {entry.date && (
                    <span className="ml-1 text-primary font-medium">
                      ({getQuarterLabel(entry.date)})
                    </span>
                  )}
                </Label>
                <Input
                  type="date"
                  min={`${estimate.taxYear}-01-01`}
                  max={`${estimate.taxYear + 1}-01-15`}
                  value={entry.date}
                  onChange={(e) => updateEntry(index, "date", e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-7 text-sm"
                    value={entry.amount || ""}
                    onChange={(e) => updateEntry(index, "amount", Number(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeEntry(index)}
              className="mt-5 rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addEntry}>
          <Plus className="mr-1 size-3.5" />
          Add Payment
        </Button>
      </div>

      {/* Quarter summary */}
      {totalPayments > 0 && (
        <div className="mt-6 max-w-lg rounded-lg bg-muted p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Quarterly Totals
          </p>
          <div className="grid grid-cols-4 gap-3 text-sm text-center">
            {([
              { key: "q1", label: "Q1" },
              { key: "q2", label: "Q2" },
              { key: "q3", label: "Q3" },
              { key: "q4", label: "Q4" },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <p className="text-muted-foreground">{label}</p>
                <p className="font-medium">
                  {quarterTotals[key] > 0 ? formatCurrency(quarterTotals[key]) : "—"}
                </p>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between text-sm">
            <span className="font-medium">Total</span>
            <span className="font-semibold">{formatCurrency(totalPayments)}</span>
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No payments yet? That's fine — just continue to review your estimate.
        </p>
      )}
    </div>
  );
}
