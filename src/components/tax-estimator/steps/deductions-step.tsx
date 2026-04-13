import { useState, useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemizedDeductionsSchema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MoneyField } from "@/components/tax-estimator/document-forms/form-field-helpers";
import { updateEstimate } from "@/lib/tax-estimator/server-fns";
import { STANDARD_DEDUCTIONS, FILING_STATUS_LABELS } from "@/lib/tax-estimator/tax-data";
import { formatCurrency } from "@/lib/tax-estimator/format";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilingStatus, EstimateWithDocuments, Mortgage1098Data } from "@/lib/tax-estimator/types";

type ItemizedData = z.infer<typeof itemizedDeductionsSchema>;

interface DeductionsStepProps {
  estimate: EstimateWithDocuments;
  onSaved?: () => void;
}

export function DeductionsStep({ estimate, onSaved }: DeductionsStepProps) {
  const router = useRouter();

  // Pre-fill mortgage interest from 1098 documents
  const totalMortgageInterest = estimate.documents
    .filter((d) => d.documentType === "1098")
    .reduce((sum, d) => {
      const data = d.data as unknown as Mortgage1098Data;
      return sum + (data.mortgageInterest ?? 0) + (data.pointsPaid ?? 0) + (data.mortgageInsurancePremiums ?? 0);
    }, 0);

  const form = useForm<ItemizedData>({
    resolver: zodResolver(itemizedDeductionsSchema),
    defaultValues: {
      mortgageInterest: estimate.itemizedDeductions?.mortgageInterest ?? totalMortgageInterest,
      stateLocalTaxes: estimate.itemizedDeductions?.stateLocalTaxes ?? 0,
      charitableContributions: estimate.itemizedDeductions?.charitableContributions ?? 0,
      medicalExpenses: estimate.itemizedDeductions?.medicalExpenses ?? 0,
      otherDeductions: estimate.itemizedDeductions?.otherDeductions ?? 0,
    },
  });

  const filingStatus = estimate.filingStatus as FilingStatus;
  const standardAmount =
    STANDARD_DEDUCTIONS[String(estimate.taxYear)]?.[filingStatus] ?? 0;

  const watched = form.watch();
  const saltCapped = Math.min(watched.stateLocalTaxes || 0, 10000);
  const itemizedTotal =
    (watched.mortgageInterest || 0) +
    saltCapped +
    (watched.charitableContributions || 0) +
    (watched.medicalExpenses || 0) +
    (watched.otherDeductions || 0);

  const itemizedIsBetter = itemizedTotal > standardAmount;
  const recommendedType = itemizedIsBetter ? "itemized" : "standard";
  const recommendedAmount = itemizedIsBetter ? itemizedTotal : standardAmount;

  // Auto-save on changes (debounced)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const itemizedDeductions = form.getValues();
      try {
        await updateEstimate({
          data: {
            id: estimate.id,
            useItemizedDeductions: itemizedIsBetter,
            itemizedDeductions,
          },
        });
      } catch {
        // silent — will save on next change
      }
    }, 800);
    return () => clearTimeout(saveTimeout.current);
  }, [watched.mortgageInterest, watched.stateLocalTaxes, watched.charitableContributions, watched.medicalExpenses, watched.otherDeductions]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Deductions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your deductible expenses for {estimate.taxYear}. We'll automatically pick whichever saves you more — standard or itemized.
        </p>
      </div>

      {/* Itemized input fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField
          label="Mortgage interest & points"
          name="mortgageInterest"
          register={form.register}
          errors={form.formState.errors}
          hint={totalMortgageInterest > 0 ? `Pre-filled from 1098: ${formatCurrency(totalMortgageInterest)}` : undefined}
        />
        <MoneyField
          label="State & local taxes (SALT)"
          name="stateLocalTaxes"
          register={form.register}
          errors={form.formState.errors}
          hint="Capped at $10,000"
        />
        <MoneyField
          label="Charitable contributions"
          name="charitableContributions"
          register={form.register}
          errors={form.formState.errors}
        />
        <MoneyField
          label="Medical expenses"
          name="medicalExpenses"
          register={form.register}
          errors={form.formState.errors}
          hint="Only deductible above 7.5% of AGI"
        />
        <MoneyField
          label="Other deductions"
          name="otherDeductions"
          register={form.register}
          errors={form.formState.errors}
        />
      </div>

      {/* Comparison */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div
          className={cn(
            "rounded-lg border p-4",
            !itemizedIsBetter
              ? "border-primary bg-primary/5"
              : "border-border",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Standard Deduction</span>
            {!itemizedIsBetter && <Check className="size-4 text-primary" />}
          </div>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(standardAmount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {FILING_STATUS_LABELS[filingStatus]} — {estimate.taxYear}
          </p>
        </div>

        <div
          className={cn(
            "rounded-lg border p-4",
            itemizedIsBetter
              ? "border-primary bg-primary/5"
              : "border-border",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Itemized Total</span>
            {itemizedIsBetter && <Check className="size-4 text-primary" />}
          </div>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(itemizedTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {saltCapped < (watched.stateLocalTaxes || 0)
              ? `Includes SALT capped at $10,000`
              : "Based on your entries above"}
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <Alert className="mt-4">
        <AlertDescription>
          {itemizedIsBetter ? (
            <>Your itemized deductions save you <strong>{formatCurrency(itemizedTotal - standardAmount)}</strong> more than the standard deduction. We'll use <strong>itemized</strong>.</>
          ) : (
            <>The standard deduction ({formatCurrency(standardAmount)}) is higher than your itemized total ({formatCurrency(itemizedTotal)}). We'll use <strong>standard</strong>.</>
          )}
        </AlertDescription>
      </Alert>

    </div>
  );
}
