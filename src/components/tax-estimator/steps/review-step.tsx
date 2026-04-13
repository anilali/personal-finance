import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { DOCUMENT_TYPE_INFO, FILING_STATUS_LABELS, STANDARD_DEDUCTIONS } from "@/lib/tax-estimator/tax-data";
import { aggregateIncome } from "@/lib/tax-estimator/calculator";
import { formatCurrency } from "@/lib/tax-estimator/format";
import type { WizardStep } from "@/components/tax-estimator/wizard-shell";
import type { EstimateWithDocuments, FilingStatus } from "@/lib/tax-estimator/types";

interface ReviewStepProps {
  estimate: EstimateWithDocuments;
  onEditStep: (step: WizardStep) => void;
}

export function ReviewStep({ estimate, onEditStep }: ReviewStepProps) {
  const income = aggregateIncome(estimate.documents);

  const docsByType = new Map<string, typeof estimate.documents>();
  for (const doc of estimate.documents) {
    const existing = docsByType.get(doc.documentType) ?? [];
    existing.push(doc);
    docsByType.set(doc.documentType, existing);
  }

  const filingStatus = estimate.filingStatus as FilingStatus;
  const standardDeduction = STANDARD_DEDUCTIONS[String(estimate.taxYear)]?.[filingStatus] ?? 0;
  const isQuarterly = estimate.estimateType === "quarterly";
  const totalPayments = estimate.quarterlyPaymentsMade.q1 + estimate.quarterlyPaymentsMade.q2 + estimate.quarterlyPaymentsMade.q3 + estimate.quarterlyPaymentsMade.q4;

  const incomeRows = [
    { label: "Wages & Salary", amount: income.wages },
    { label: "Ordinary Dividends", amount: income.ordinaryDividends },
    { label: "Qualified Dividends", amount: income.qualifiedDividends },
    { label: "Interest Income", amount: income.interestIncome },
    { label: "Short-Term Capital Gains", amount: income.shortTermCapitalGains },
    { label: "Long-Term Capital Gains", amount: income.longTermCapitalGains },
    { label: "Business Income", amount: income.businessIncome },
    { label: "Rental Income", amount: income.rentalIncome },
    { label: "Retirement Income", amount: income.retirementIncome },
    { label: "Other Income", amount: income.otherIncome },
  ].filter((r) => r.amount !== 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Review Your Information</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify everything looks correct before calculating
        </p>
      </div>

      <div className="space-y-6">
        {/* Filing Info */}
        <Section title="Filing Information" onEdit={() => onEditStep("list")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Estimate Name" value={estimate.name} />
            <InfoRow label="Tax Year" value={String(estimate.taxYear)} />
            <InfoRow label="Type" value={isQuarterly ? `Quarterly (Q${estimate.currentQuarter})` : "Year-end"} />
            <InfoRow label="Filing Status" value={FILING_STATUS_LABELS[filingStatus]} />
            <InfoRow label="State" value={estimate.state} />
            {estimate.capitalLossCarryforward > 0 && (
              <InfoRow label="Capital Loss Carryforward" value={formatCurrency(estimate.capitalLossCarryforward)} />
            )}
          </div>
        </Section>

        {/* Income Summary */}
        <Section title="Income Summary" onEdit={() => onEditStep("details")}>
          {incomeRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No income entered</p>
          ) : (
            <div className="space-y-2">
              {incomeRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium">{formatCurrency(row.amount)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Income</span>
                <span className="text-lg font-bold">{formatCurrency(income.totalIncome)}</span>
              </div>
            </div>
          )}
        </Section>

        {/* Documents */}
        <Section title={`Documents (${estimate.documents.length})`} onEdit={() => onEditStep("details")}>
          {docsByType.size === 0 ? (
            <p className="text-sm text-muted-foreground">No documents entered</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...docsByType.entries()].map(([type, docs]) => (
                <Badge key={type} variant="secondary" className="text-sm">
                  {DOCUMENT_TYPE_INFO[type]?.label ?? type}
                  {docs.length > 1 && ` (${docs.length})`}
                </Badge>
              ))}
            </div>
          )}
        </Section>

        {/* Deductions */}
        <Section title="Deductions" onEdit={() => onEditStep("deductions")}>
          {estimate.useItemizedDeductions && estimate.itemizedDeductions ? (
            <div className="space-y-2">
              <Badge variant="secondary">Itemized</Badge>
              <div className="mt-2 space-y-1 text-sm">
                {Object.entries(estimate.itemizedDeductions).map(([key, val]) => {
                  if (!val) return null;
                  const labels: Record<string, string> = {
                    mortgageInterest: "Mortgage Interest",
                    stateLocalTaxes: "State & Local Taxes",
                    charitableContributions: "Charitable Contributions",
                    medicalExpenses: "Medical Expenses",
                    otherDeductions: "Other Deductions",
                  };
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">{labels[key] ?? key}</span>
                      <span>{formatCurrency(val as number)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Badge variant="secondary">Standard</Badge>
              <span className="font-medium">{formatCurrency(standardDeduction)}</span>
            </div>
          )}
        </Section>

        {/* Payments Made */}
        <Section title="Estimated Payments Made" onEdit={() => onEditStep("payments")}>
          {totalPayments > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total payments to IRS</span>
              <span className="font-medium">{formatCurrency(totalPayments)}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No estimated payments entered</p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="mr-1 size-3" />
          Edit
        </Button>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
