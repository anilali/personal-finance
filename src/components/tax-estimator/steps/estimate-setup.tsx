import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Calendar, FileText, Clock } from "lucide-react";
import { createEstimate } from "@/lib/tax-estimator/server-fns";
import { STATES, FILING_STATUS_LABELS } from "@/lib/tax-estimator/tax-data";
import { MoneyField } from "@/components/tax-estimator/document-forms/form-field-helpers";
import { cn } from "@/lib/utils";
import type { FilingStatus, EstimateType } from "@/lib/tax-estimator/types";

// ── Setup sub-steps ──────────────────────────────────────────────

type SetupPhase = "year" | "type" | "quarterly-details" | "filing";

function getCurrentQuarter(): number {
  const month = new Date().getMonth();
  if (month < 3) return 1;
  if (month < 5) return 2;
  if (month < 8) return 3;
  return 4;
}

function suggestEstimateType(taxYear: number): EstimateType {
  const currentYear = new Date().getFullYear();
  if (taxYear < currentYear) return "year-end";
  return "quarterly";
}

// ── Form schema ──────────────────────────────────────────────────

const setupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  taxYear: z.number().int().min(2024).max(2026),
  estimateType: z.enum(["year-end", "quarterly"]),
  filingStatus: z.enum(["single", "mfj", "mfs", "hoh", "qss"]),
  state: z.string().min(2, "Select a state"),
  currentQuarter: z.number().int().min(1).max(4),
  priorYearTax: z.number().min(0),
  priorYearStateTax: z.number().min(0),
  capitalLossCarryforward: z.number().min(0),
});

type SetupFormData = z.infer<typeof setupSchema>;

// ── Component ────────────────────────────────────────────────────

interface EstimateSetupProps {
  onCreated: (estimateId: string) => void;
  onCancel: () => void;
}

export function EstimateSetup({ onCreated, onCancel }: EstimateSetupProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<SetupPhase>("year");

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      name: "",
      taxYear: 2026,
      estimateType: "quarterly",
      filingStatus: "single",
      state: "",
      currentQuarter: getCurrentQuarter(),
      priorYearTax: 0,
      priorYearStateTax: 0,
      capitalLossCarryforward: 0,
    },
  });

  const taxYear = form.watch("taxYear");
  const estimateType = form.watch("estimateType");
  const currentQuarter = form.watch("currentQuarter");

  const handleCreate = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const data = form.getValues();
    try {
      const est = await createEstimate({
        data: {
          name: data.name,
          taxYear: data.taxYear,
          estimateType: data.estimateType,
          filingStatus: data.filingStatus,
          state: data.state,
          currentQuarter: data.estimateType === "quarterly" ? data.currentQuarter : 1,
          priorYearTax: data.priorYearTax,
          priorYearStateTax: data.priorYearStateTax,
          capitalLossCarryforward: data.capitalLossCarryforward,
        },
      });
      toast.success(`Created "${data.name}"`);
      router.invalidate();
      onCreated(est.id);
    } catch {
      toast.error("Failed to create estimate");
    }
  };

  const goNext = () => {
    if (phase === "year") setPhase("type");
    else if (phase === "type") setPhase(estimateType === "quarterly" ? "quarterly-details" : "filing");
    else if (phase === "quarterly-details") setPhase("filing");
  };

  const goBack = () => {
    if (phase === "filing") setPhase(estimateType === "quarterly" ? "quarterly-details" : "type");
    else if (phase === "quarterly-details") setPhase("type");
    else if (phase === "type") setPhase("year");
    else onCancel();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">New Estimate</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {phase === "year" && "Let's start with the basics"}
          {phase === "type" && "What kind of estimate do you need?"}
          {phase === "quarterly-details" && "Tell us about your quarterly payments"}
          {phase === "filing" && "Almost done — a few more details"}
        </p>
      </div>

      {/* ── Year selection ── */}
      {phase === "year" && (
        <div className="space-y-4">
          <Label className="text-base font-medium">Which tax year is this estimate for?</Label>
          <div className="grid gap-3 sm:grid-cols-2 max-w-md">
            {[2026, 2025, 2024].map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => {
                  form.setValue("taxYear", year);
                  form.setValue("estimateType", suggestEstimateType(year));
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-all",
                  taxYear === year
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30",
                )}
              >
                <Calendar className={cn("size-5", taxYear === year ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <span className="font-semibold">{year}</span>
                  {year === new Date().getFullYear() && (
                    <span className="ml-2 text-xs text-muted-foreground">Current year</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Estimate type ── */}
      {phase === "type" && (
        <div className="space-y-4">
          <Label className="text-base font-medium">What type of estimate?</Label>
          <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
            <button
              type="button"
              onClick={() => form.setValue("estimateType", "quarterly")}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-5 text-left transition-all",
                estimateType === "quarterly"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30",
              )}
            >
              <Clock className={cn("size-5", estimateType === "quarterly" ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="font-semibold">Quarterly Estimate</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  I'm mid-year and want to calculate my next estimated payment
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => form.setValue("estimateType", "year-end")}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-5 text-left transition-all",
                estimateType === "year-end"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30",
              )}
            >
              <FileText className={cn("size-5", estimateType === "year-end" ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="font-semibold">Year-End Estimate</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  I have my final W-2s and 1099s and want to estimate my total tax
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Quarterly details ── */}
      {phase === "quarterly-details" && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-base font-medium">Which quarter are you in?</Label>
            <div className="grid gap-2 sm:grid-cols-4 max-w-lg">
              {([
                { q: 1, label: "Q1", months: "Jan–Mar" },
                { q: 2, label: "Q2", months: "Apr–May" },
                { q: 3, label: "Q3", months: "Jun–Aug" },
                { q: 4, label: "Q4", months: "Sep–Dec" },
              ] as const).map(({ q, label, months }) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => form.setValue("currentQuarter", q)}
                  className={cn(
                    "rounded-lg border p-3 text-center transition-all",
                    currentQuarter === q
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30",
                  )}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="text-xs text-muted-foreground">{months}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Filing details ── */}
      {phase === "filing" && (
        <div className="space-y-5 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="setup-name">Give this estimate a name</Label>
            <Input
              id="setup-name"
              placeholder={`e.g. ${taxYear} ${estimateType === "quarterly" ? `Q${currentQuarter}` : ""} Tax Estimate`}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Filing Status</Label>
            <RadioGroup
              value={form.watch("filingStatus")}
              onValueChange={(v) => form.setValue("filingStatus", v as FilingStatus)}
              className="space-y-2"
            >
              {(Object.entries(FILING_STATUS_LABELS) as [FilingStatus, string][]).map(
                ([value, label]) => (
                  <div key={value} className="flex items-center gap-2">
                    <RadioGroupItem value={value} id={`setup-fs-${value}`} />
                    <Label htmlFor={`setup-fs-${value}`} className="font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ),
              )}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Select
              value={form.watch("state")}
              onValueChange={(v) => form.setValue("state", v)}
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
            {form.formState.errors.state && (
              <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
            )}
          </div>

          <div className="space-y-1 pt-2">
            <p className="text-sm font-medium">Prior Year Tax Info</p>
            <p className="text-xs text-muted-foreground">Used for safe harbor calculations and penalty estimates</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              label="Prior year federal tax"
              name="priorYearTax"
              register={form.register}
              errors={form.formState.errors}
              hint="From your prior year 1040, line 24"
            />
            <MoneyField
              label="Prior year state tax"
              name="priorYearStateTax"
              register={form.register}
              errors={form.formState.errors}
              hint="From your prior year state return"
            />
          </div>

          <MoneyField
            label="Capital loss carryforward"
            name="capitalLossCarryforward"
            register={form.register}
            errors={form.formState.errors}
            hint="From your prior year Schedule D, line 21"
          />
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-1 size-4" />
          {phase === "year" ? "Cancel" : "Back"}
        </Button>

        {phase === "filing" ? (
          <Button onClick={handleCreate} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create & Continue"}
            <ArrowRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button onClick={goNext}>
            Next
            <ArrowRight className="ml-1 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
