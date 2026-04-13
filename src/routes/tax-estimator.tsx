import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WizardShell, type WizardStep } from "@/components/tax-estimator/wizard-shell";
import { EstimateList } from "@/components/tax-estimator/steps/estimate-list";
import { EstimateSetup } from "@/components/tax-estimator/steps/estimate-setup";
import { DocumentSelect } from "@/components/tax-estimator/steps/document-select";
import { DocumentDetails } from "@/components/tax-estimator/steps/document-details";
import { DeductionsStep } from "@/components/tax-estimator/steps/deductions-step";
import { PaymentsStep } from "@/components/tax-estimator/steps/payments-step";
import { ReviewStep } from "@/components/tax-estimator/steps/review-step";
import { ResultsStep } from "@/components/tax-estimator/steps/results-step";
import { getEstimates, getEstimate } from "@/lib/tax-estimator/server-fns";
import type { Estimate, EstimateWithDocuments } from "@/lib/tax-estimator/types";

type TaxEstimatorSearch = {
  step: WizardStep;
  estimateId?: string;
};

export const Route = createFileRoute("/tax-estimator")({
  validateSearch: (search: Record<string, unknown>): TaxEstimatorSearch => ({
    step: (search.step as WizardStep) || "list",
    estimateId: search.estimateId as string | undefined,
  }),
  loaderDeps: ({ search }) => ({
    step: search.step,
    estimateId: search.estimateId,
  }),
  loader: async ({ deps }) => {
    const allEstimates = await getEstimates();
    const currentEstimate =
      deps.estimateId
        ? await getEstimate({ data: { estimateId: deps.estimateId } })
        : null;
    return {
      estimates: allEstimates as Estimate[],
      currentEstimate: currentEstimate as EstimateWithDocuments | null,
    };
  },
  component: TaxEstimatorPage,
});

function TaxEstimatorPage() {
  const { step, estimateId } = Route.useSearch();
  const { estimates, currentEstimate } = Route.useLoaderData();
  const navigate = useNavigate();

  const goToStep = (nextStep: WizardStep, nextEstimateId?: string) => {
    navigate({
      to: "/tax-estimator",
      search: { step: nextStep, estimateId: nextEstimateId ?? estimateId },
    });
  };

  const steps: WizardStep[] = ["list", "setup", "documents", "details", "deductions", "payments", "review", "results"];

  return (
    <WizardShell
      currentStep={step}
      estimateId={estimateId}
      showNav={!["list", "setup", "results"].includes(step)}
      onNext={() => {
        const idx = steps.indexOf(step);
        if (idx < steps.length - 1) goToStep(steps[idx + 1]);
      }}
      onPrev={() => {
        if (step === "documents") {
          goToStep("list");
        } else {
          const idx = steps.indexOf(step);
          if (idx > 2) goToStep(steps[idx - 1]);
        }
      }}
    >
      {step === "list" && (
        <EstimateList
          estimates={estimates}
          onSelect={(id: string) => goToStep("details", id)}
          onNewEstimate={() => goToStep("setup")}
        />
      )}
      {step === "setup" && (
        <EstimateSetup
          onCreated={(id: string) => goToStep("documents", id)}
          onCancel={() => goToStep("list")}
        />
      )}
      {step === "documents" && currentEstimate && (
        <DocumentSelect
          estimate={currentEstimate}
          onContinue={() => goToStep("details")}
        />
      )}
      {step === "details" && currentEstimate && (
        <DocumentDetails estimate={currentEstimate} />
      )}
      {step === "deductions" && currentEstimate && (
        <DeductionsStep estimate={currentEstimate} />
      )}
      {step === "payments" && currentEstimate && (
        <PaymentsStep estimate={currentEstimate} />
      )}
      {step === "review" && currentEstimate && (
        <ReviewStep
          estimate={currentEstimate}
          onEditStep={(s: WizardStep) => goToStep(s)}
        />
      )}
      {step === "results" && currentEstimate && (
        <ResultsStep
          estimate={currentEstimate}
          onBack={() => goToStep("review")}
          onNewEstimate={() => goToStep("list")}
        />
      )}
    </WizardShell>
  );
}
