import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { calculateTax } from "@/lib/tax-estimator/server-fns";
import { formatCurrency, formatPercent } from "@/lib/tax-estimator/format";
import { FILING_STATUS_LABELS } from "@/lib/tax-estimator/tax-data";
import type {
  EstimateWithDocuments,
  TaxCalculationResult,
  FilingStatus,
} from "@/lib/tax-estimator/types";
import { cn } from "@/lib/utils";

interface ResultsStepProps {
  estimate: EstimateWithDocuments;
  onBack: () => void;
  onNewEstimate: () => void;
}

export function ResultsStep({ estimate, onBack, onNewEstimate }: ResultsStepProps) {
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    calculateTax({ data: { estimateId: estimate.id } })
      .then((res: TaxCalculationResult | null) => {
        if (!cancelled) {
          setResult(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to calculate tax estimate");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [estimate.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="mb-4 size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Calculating your tax estimate...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="py-8">
        <Alert variant="destructive">
          <AlertDescription>{error ?? "Unable to compute estimate"}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-1 size-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const { federal, state, income, withholdings, totalTaxLiability, totalPaymentsMade, netOwed, effectiveRate, quarterlyPayments, nextPaymentDue, penalty } = result;
  const isRefund = netOwed < 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{estimate.name}</h2>
        <p className="text-sm text-muted-foreground">
          {estimate.taxYear} / {FILING_STATUS_LABELS[estimate.filingStatus as FilingStatus]} / {estimate.state}
        </p>
      </div>

      {/* Net Result Banner */}
      <div className={cn(
        "mb-6 rounded-xl border p-6 text-center",
        isRefund
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50",
      )}>
        <p className="text-sm font-medium text-muted-foreground">
          {isRefund ? "Estimated Refund" : "Estimated Tax Owed"}
        </p>
        <p className={cn(
          "mt-1 text-4xl font-extrabold tracking-tight",
          isRefund ? "text-emerald-600" : "text-destructive",
        )}>
          {formatCurrency(Math.abs(netOwed))}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Effective tax rate: {formatPercent(effectiveRate)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Federal Tax */}
        <div className="rounded-lg border border-border p-5">
          <h3 className="mb-4 font-semibold">Federal Tax</h3>
          <div className="space-y-2 text-sm">
            <Row label="Total Income" value={formatCurrency(income.totalIncome)} />
            <Row label="Adjusted Gross Income" value={formatCurrency(federal.agi)} />
            <Row
              label={`Deduction (${federal.deductionType})`}
              value={`-${formatCurrency(federal.deduction)}`}
              muted
            />
            {federal.capitalLossDeduction > 0 && (
              <Row label="Capital loss deduction" value={`-${formatCurrency(federal.capitalLossDeduction)}`} muted />
            )}
            <Separator />
            <Row label="Taxable Ordinary Income" value={formatCurrency(federal.taxableOrdinaryIncome)} />
            <Row label="Tax on Ordinary Income" value={formatCurrency(federal.ordinaryTax)} />
            {federal.capitalGainsTax > 0 && (
              <Row label="Tax on Cap Gains / Qual Dividends" value={formatCurrency(federal.capitalGainsTax)} />
            )}
            {federal.selfEmploymentTax > 0 && (
              <Row label="Self-Employment Tax" value={formatCurrency(federal.selfEmploymentTax)} />
            )}
            {federal.niit > 0 && (
              <Row label="Net Investment Income Tax (3.8%)" value={formatCurrency(federal.niit)} />
            )}
            <Separator />
            <Row label="Total Federal Tax" value={formatCurrency(federal.totalTax)} bold />
            <Row label="Federal Withholdings" value={`-${formatCurrency(withholdings.federalWithholdings)}`} muted />
            <Separator />
            <Row
              label="Federal Net"
              value={formatCurrency(federal.totalTax - withholdings.federalWithholdings)}
              bold
              color={federal.totalTax - withholdings.federalWithholdings < 0 ? "green" : "red"}
            />
          </div>
        </div>

        {/* State Tax */}
        <div className="rounded-lg border border-border p-5">
          <h3 className="mb-4 font-semibold">{state.stateName} State Tax</h3>
          {!state.hasIncomeTax ? (
            <p className="text-sm text-muted-foreground">
              {state.stateName} has no state income tax.
            </p>
          ) : !state.isSupported ? (
            <Alert>
              <AlertDescription>
                State tax calculation for {state.stateCode} is not yet supported.
                Only CA, NY, NJ, IL, PA and no-income-tax states are currently supported.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 text-sm">
              <Row label="Taxable Income" value={formatCurrency(state.taxableIncome)} />
              <Separator />
              <Row label="State Tax" value={formatCurrency(state.stateTax)} bold />
              <Row label="State Withholdings" value={`-${formatCurrency(withholdings.stateWithholdings)}`} muted />
              <Separator />
              <Row
                label="State Net"
                value={formatCurrency(state.stateTax - withholdings.stateWithholdings)}
                bold
                color={state.stateTax - withholdings.stateWithholdings < 0 ? "green" : "red"}
              />
            </div>
          )}
        </div>

        {/* Combined Summary */}
        <div className="rounded-lg border border-border p-5">
          <h3 className="mb-4 font-semibold">Combined Summary</h3>
          <div className="space-y-2 text-sm">
            <Row label="Total Tax Liability" value={formatCurrency(totalTaxLiability)} />
            <Row label="Total Withholdings" value={`-${formatCurrency(withholdings.totalWithholdings)}`} muted />
            {totalPaymentsMade > 0 && (
              <Row label="Estimated Payments Made" value={`-${formatCurrency(totalPaymentsMade)}`} muted />
            )}
            <Separator />
            <Row
              label={isRefund ? "Estimated Refund" : "Estimated Amount Owed"}
              value={formatCurrency(Math.abs(netOwed))}
              bold
              color={isRefund ? "green" : "red"}
            />
            <Row label="Effective Tax Rate" value={formatPercent(effectiveRate)} />
          </div>
        </div>

        {/* Quarterly Payments — only for quarterly estimates */}
        {estimate.estimateType === "quarterly" && (
          <div className="rounded-lg border border-border p-5">
            <h3 className="mb-4 font-semibold">Quarterly Estimated Payments</h3>

            {/* Next payment highlight */}
            {nextPaymentDue && (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Next Payment Due</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{nextPaymentDue.quarter} — {nextPaymentDue.dueDate}</span>
                  <span className="text-xl font-bold">{formatCurrency(nextPaymentDue.remaining)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {quarterlyPayments.map((qp) => (
                <div
                  key={qp.quarter}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-4 py-3",
                    qp.isPast ? "bg-slate-50 opacity-60" : "bg-slate-50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-medium">{qp.quarter}</span>
                      <span className="ml-2 text-sm text-muted-foreground">Due {qp.dueDate}</span>
                    </div>
                    {qp.isPast && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        Paid
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {qp.paid > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Paid: {formatCurrency(qp.paid)}
                      </div>
                    )}
                    <span className={cn(
                      "font-semibold",
                      qp.isPast ? "text-muted-foreground" : "",
                    )}>
                      {qp.isPast ? formatCurrency(qp.paid) : formatCurrency(qp.remaining)}
                    </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Underpayment Penalty */}
        {(penalty.totalPenalty > 0 || penalty.safeHarborMet) && (
          <div className="rounded-lg border border-border p-5 lg:col-span-2">
            <h3 className="mb-4 font-semibold">Underpayment Penalty Estimate</h3>

            {penalty.safeHarborMet ? (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <span className="text-sm text-emerald-800">
                  Safe harbor met
                  {penalty.safeHarborMethod === "90_current_year" && " — paid ≥ 90% of current year tax"}
                  {penalty.safeHarborMethod === "100_prior_year" && " — paid ≥ 100% of prior year tax"}
                  {penalty.safeHarborMethod === "110_prior_year" && " — paid ≥ 110% of prior year tax (AGI > $150k)"}
                  {penalty.safeHarborMethod === "owed_under_1000" && " — owed less than $1,000"}
                  . No penalty expected.
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {penalty.federalPenalty > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Federal (Form 2210)</p>
                    <div className="space-y-1 text-sm">
                      {penalty.federalQuarters.map((q) => (
                        <div key={q.quarter} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {q.quarter}: required {formatCurrency(q.required)}, paid {formatCurrency(q.paid)}
                            {q.shortfall > 0 && <span className="text-destructive"> — short {formatCurrency(q.shortfall)}</span>}
                          </span>
                          <span className={q.penalty > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {q.penalty > 0 ? formatCurrency(q.penalty) : "—"}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Federal penalty estimate</span>
                        <span className="text-destructive">{formatCurrency(penalty.federalPenalty)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {penalty.statePenalty > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">{state.stateName} State Penalty</p>
                    <div className="space-y-1 text-sm">
                      {penalty.stateQuarters.map((q) => (
                        <div key={q.quarter} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {q.quarter}: required {formatCurrency(q.required)}, paid {formatCurrency(q.paid)}
                            {q.shortfall > 0 && <span className="text-destructive"> — short {formatCurrency(q.shortfall)}</span>}
                          </span>
                          <span className={q.penalty > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {q.penalty > 0 ? formatCurrency(q.penalty) : "—"}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>State penalty estimate</span>
                        <span className="text-destructive">{formatCurrency(penalty.statePenalty)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {penalty.totalPenalty > 0 && (
                  <div className="flex justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                    <span className="font-medium">Total estimated penalty</span>
                    <span className="font-semibold text-destructive">{formatCurrency(penalty.totalPenalty)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" />
          Back to Review
        </Button>
        <Button variant="outline" onClick={onNewEstimate}>
          <Plus className="mr-1 size-4" />
          New Estimate
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  color?: "green" | "red";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(
        bold ? "font-medium" : "",
        muted ? "text-muted-foreground" : "",
      )}>
        {label}
      </span>
      <span className={cn(
        bold ? "font-semibold" : "",
        muted ? "text-muted-foreground" : "",
        color === "green" ? "text-emerald-600" : "",
        color === "red" ? "text-destructive" : "",
      )}>
        {value}
      </span>
    </div>
  );
}
