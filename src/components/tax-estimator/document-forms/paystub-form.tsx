import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paystubSchema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MoneyField } from "./form-field-helpers";
import { STATES } from "@/lib/tax-estimator/tax-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Check } from "lucide-react";

type PaystubFormData = z.infer<typeof paystubSchema>;

interface PaystubFormProps {
  defaultValues?: Partial<PaystubFormData>;
  onSubmit: (data: PaystubFormData) => Promise<void>;
  onDelete?: () => void;
}

// ── Pay frequency detection ──────────────────────────────────────

interface DetectedFrequency {
  label: string;
  totalPayPeriods: number;
  payPeriodsCompleted: number;
  confidence: "high" | "medium";
}

function detectFrequency(dateStrings: string[]): DetectedFrequency | null {
  const dates = dateStrings
    .map((s) => new Date(s + "T12:00:00")) // noon to avoid TZ issues
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 2) return null;

  // Calculate gaps in days between consecutive dates
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const diffMs = dates[i].getTime() - dates[i - 1].getTime();
    gaps.push(Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;

  // Detect frequency from average gap
  let totalPayPeriods: number;
  let label: string;
  let confidence: "high" | "medium" = "high";

  if (avgGap >= 5 && avgGap <= 9) {
    totalPayPeriods = 52;
    label = "Weekly";
  } else if (avgGap >= 12 && avgGap <= 16) {
    // Distinguish bi-weekly (14 days) from semi-monthly (15-16 days)
    if (avgGap <= 14.5) {
      totalPayPeriods = 26;
      label = "Bi-weekly";
    } else {
      totalPayPeriods = 24;
      label = "Semi-monthly";
    }
    // Close to boundary — lower confidence
    if (avgGap >= 14 && avgGap <= 15.5) confidence = "medium";
  } else if (avgGap >= 27 && avgGap <= 33) {
    totalPayPeriods = 12;
    label = "Monthly";
  } else {
    // Non-standard — guess based on closest match
    if (avgGap < 11) { totalPayPeriods = 52; label = "Weekly"; }
    else if (avgGap < 20) { totalPayPeriods = 26; label = "Bi-weekly"; }
    else { totalPayPeriods = 12; label = "Monthly"; }
    confidence = "medium";
  }

  // Estimate periods completed: from Jan 1 to the latest pay date
  const latestDate = dates[dates.length - 1];
  const yearStart = new Date(latestDate.getFullYear(), 0, 1);
  const daysSinceYearStart = Math.round(
    (latestDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const estimatedCompleted = Math.max(
    1,
    Math.round(daysSinceYearStart / (365 / totalPayPeriods)),
  );

  return {
    label,
    totalPayPeriods,
    payPeriodsCompleted: Math.min(estimatedCompleted, totalPayPeriods),
    confidence,
  };
}

// ── Component ────────────────────────────────────────────────────

export function PaystubForm({ defaultValues, onSubmit, onDelete }: PaystubFormProps) {
  const [payDate1, setPayDate1] = useState("");
  const [payDate2, setPayDate2] = useState("");
  const [payDate3, setPayDate3] = useState("");
  const [detected, setDetected] = useState<DetectedFrequency | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  const form = useForm<PaystubFormData>({
    resolver: zodResolver(paystubSchema),
    defaultValues: {
      payPeriodsCompleted: 1,
      totalPayPeriods: 26,
      ytdWages: 0,
      ytdFederalWithheld: 0,
      ytdSocialSecurityWages: 0,
      ytdSocialSecurityWithheld: 0,
      ytdMedicareWages: 0,
      ytdMedicareWithheld: 0,
      ytdStateWages: 0,
      ytdStateWithheld: 0,
      stateCode: "",
      ...defaultValues,
    },
  });

  // Detect frequency when dates change
  useEffect(() => {
    if (manualOverride) return;
    const dates = [payDate1, payDate2, payDate3].filter(Boolean);
    const result = detectFrequency(dates);
    setDetected(result);
    if (result) {
      form.setValue("totalPayPeriods", result.totalPayPeriods);
      form.setValue("payPeriodsCompleted", result.payPeriodsCompleted);
    }
  }, [payDate1, payDate2, payDate3, manualOverride]);

  // If we have saved defaults with periods, skip the date entry
  const hasSavedPeriods = defaultValues?.payPeriodsCompleted && defaultValues.payPeriodsCompleted > 0;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Pay date detection */}
      {!hasSavedPeriods && (
        <div className="rounded-lg border border-border bg-slate-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium">Enter 2-3 recent pay dates to detect your pay schedule</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pay date 1</Label>
              <Input type="date" value={payDate1} onChange={(e) => setPayDate1(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pay date 2</Label>
              <Input type="date" value={payDate2} onChange={(e) => setPayDate2(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pay date 3 (optional)</Label>
              <Input type="date" value={payDate3} onChange={(e) => setPayDate3(e.target.value)} />
            </div>
          </div>

          {detected && (
            <div className="flex items-center gap-2 rounded-md bg-white border border-border px-3 py-2">
              <Check className="size-4 text-emerald-600" />
              <span className="text-sm">
                Detected: <span className="font-semibold">{detected.label}</span> ({detected.totalPayPeriods}/yr)
              </span>
              <span className="text-sm text-muted-foreground">
                — ~{detected.payPeriodsCompleted} periods completed
              </span>
              {detected.confidence === "medium" && (
                <Badge variant="secondary" className="text-xs">verify</Badge>
              )}
            </div>
          )}

          {!detected && payDate1 && payDate2 && (
            <p className="text-xs text-muted-foreground">
              Couldn't detect frequency. You can set it manually below.
            </p>
          )}
        </div>
      )}

      {/* Manual override / fine-tune */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="payPeriodsCompleted" className="text-sm">
            Pay periods completed
            {detected && !manualOverride && (
              <button
                type="button"
                className="ml-2 text-xs text-primary hover:underline"
                onClick={() => setManualOverride(true)}
              >
                edit
              </button>
            )}
          </Label>
          <Input
            id="payPeriodsCompleted"
            type="number"
            min="1"
            disabled={!!detected && !manualOverride && !hasSavedPeriods}
            {...form.register("payPeriodsCompleted", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="totalPayPeriods" className="text-sm">Pay schedule</Label>
          <Select
            value={String(form.watch("totalPayPeriods"))}
            onValueChange={(v) => {
              form.setValue("totalPayPeriods", Number(v));
              setManualOverride(true);
            }}
            disabled={!!detected && !manualOverride && !hasSavedPeriods}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="52">Weekly (52)</SelectItem>
              <SelectItem value="26">Bi-weekly (26)</SelectItem>
              <SelectItem value="24">Semi-monthly (24)</SelectItem>
              <SelectItem value="12">Monthly (12)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* YTD amounts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="YTD Gross wages" name="ytdWages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="YTD Federal tax withheld" name="ytdFederalWithheld" register={form.register} errors={form.formState.errors} />
        <MoneyField label="YTD Social Security wages" name="ytdSocialSecurityWages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="YTD Social Security tax" name="ytdSocialSecurityWithheld" register={form.register} errors={form.formState.errors} />
        <MoneyField label="YTD Medicare wages" name="ytdMedicareWages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="YTD Medicare tax" name="ytdMedicareWithheld" register={form.register} errors={form.formState.errors} />
        <MoneyField label="YTD State wages" name="ytdStateWages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="YTD State tax withheld" name="ytdStateWithheld" register={form.register} errors={form.formState.errors} />
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label>State</Label>
        <Select
          value={form.watch("stateCode")}
          onValueChange={(v) => form.setValue("stateCode", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state..." />
          </SelectTrigger>
          <SelectContent>
            {STATES.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
