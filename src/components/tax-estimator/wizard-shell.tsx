import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep =
  | "list"
  | "setup"
  | "documents"
  | "details"
  | "deductions"
  | "payments"
  | "review"
  | "results";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "list", label: "Estimates" },
  { key: "setup", label: "Setup" },
  { key: "documents", label: "Documents" },
  { key: "details", label: "Details" },
  { key: "deductions", label: "Deductions" },
  { key: "payments", label: "Payments" },
  { key: "review", label: "Review" },
  { key: "results", label: "Results" },
];

interface WizardShellProps {
  currentStep: WizardStep;
  estimateId?: string;
  children: React.ReactNode;
  onNext?: () => void;
  onPrev?: () => void;
  canGoNext?: boolean;
  showNav?: boolean;
}

export function WizardShell({
  currentStep,
  estimateId,
  children,
  onNext,
  onPrev,
  canGoNext = true,
  showNav = true,
}: WizardShellProps) {
  const navigate = useNavigate();
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const isListStep = currentStep === "list" || currentStep === "setup";

  const goToStep = (step: WizardStep) => {
    navigate({
      to: "/tax-estimator",
      search: { step, estimateId },
    });
  };

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
      return;
    }
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1].key);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
      return;
    }
    if (currentIndex < STEPS.length - 1) {
      goToStep(STEPS[currentIndex + 1].key);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-accent shadow-sm">
          <Calculator className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Tax Estimator
          </h1>
          <p className="text-sm text-muted-foreground">
            Estimate your federal and state taxes step by step
          </p>
        </div>
      </div>

      {/* Step indicator (hidden on list/setup steps) */}
      {!isListStep && (
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-6">
            {STEPS.slice(2).map((step, idx) => {
              const stepIndex = idx + 2;
              const isActive = stepIndex === currentIndex;
              const isCompleted = stepIndex < currentIndex;
              return (
                <div key={step.key} className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted && estimateId) goToStep(step.key);
                    }}
                    disabled={!isCompleted}
                    className={cn(
                      "flex shrink-0 flex-col items-center gap-1 transition-all",
                      isCompleted && "cursor-pointer",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                        isActive && "bg-primary text-white",
                        isCompleted && "bg-primary/15 text-primary",
                        !isActive && !isCompleted && "bg-secondary text-muted-foreground",
                      )}
                    >
                      {stepIndex - 1}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        isActive && "text-foreground",
                        !isActive && "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                  {idx < STEPS.length - 3 && (
                    <div
                      className={cn(
                        "mb-4 h-px w-8",
                        isCompleted ? "bg-primary/30" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="p-6 sm:p-8">{children}</div>
      </div>

      {/* Navigation (hidden on list and results steps) */}
      {showNav && !isListStep && currentStep !== "results" && (
        <div className="mt-5 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex <= 1}
          >
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canGoNext}
          >
            {currentStep === "review" ? "Calculate" : "Continue"}
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
