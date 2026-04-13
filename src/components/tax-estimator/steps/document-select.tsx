import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_TYPE_INFO,
  DOCUMENT_CATEGORIES,
} from "@/lib/tax-estimator/tax-data";
import { updateEstimate, deleteDocument } from "@/lib/tax-estimator/server-fns";
import type { DocumentType, EstimateWithDocuments } from "@/lib/tax-estimator/types";

interface DocumentSelectProps {
  estimate: EstimateWithDocuments;
  onContinue: () => void;
}

export function DocumentSelect({ estimate, onContinue }: DocumentSelectProps) {
  const router = useRouter();

  // Count existing documents by type
  const docCounts = new Map<string, number>();
  for (const doc of estimate.documents) {
    docCounts.set(doc.documentType, (docCounts.get(doc.documentType) ?? 0) + 1);
  }

  // Initialize from saved selection, falling back to types with existing documents
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (estimate.selectedDocumentTypes.length > 0) {
      return new Set(estimate.selectedDocumentTypes);
    }
    return new Set(docCounts.keys());
  });

  const toggle = async (type: string) => {
    const isDeselecting = selected.has(type);
    const count = docCounts.get(type) ?? 0;

    // Warn if deselecting a type that has saved documents
    if (isDeselecting && count > 0) {
      const confirmed = confirm(
        `You have ${count} saved ${DOCUMENT_TYPE_INFO[type]?.label ?? type} entr${count === 1 ? "y" : "ies"}. Deselecting will delete ${count === 1 ? "it" : "them"}. Continue?`,
      );
      if (!confirmed) return;

      // Delete the saved documents for this type
      const docsToDelete = estimate.documents.filter((d) => d.documentType === type);
      for (const doc of docsToDelete) {
        await deleteDocument({ data: { id: doc.id } });
      }
    }

    const next = new Set(selected);
    if (isDeselecting) {
      next.delete(type);
    } else {
      next.add(type);
    }
    setSelected(next);

    // Persist selection and refresh data
    try {
      await updateEstimate({
        data: {
          id: estimate.id,
          selectedDocumentTypes: [...next],
        },
      });
      router.invalidate();
    } catch {
      // silent — will retry on next toggle
    }
  };

  // Filter document types by estimate type
  const docTypes = (Object.entries(DOCUMENT_TYPE_INFO) as [
    DocumentType,
    (typeof DOCUMENT_TYPE_INFO)[string],
  ][]).filter(([, info]) => info.estimateTypes.includes(estimate.estimateType));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          What documents do you have?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {estimate.estimateType === "quarterly"
            ? `Select the documents and income sources you have so far for ${estimate.taxYear}`
            : `Select all the tax documents you've received for ${estimate.taxYear}`}
        </p>
      </div>

      <div className="space-y-6">
        {DOCUMENT_CATEGORIES.map((category) => {
          const categoryDocs = docTypes.filter(([, info]) => info.category === category);
          if (categoryDocs.length === 0) return null;

          return (
            <div key={category}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categoryDocs.map(([type, info]) => {
                  const isSelected = selected.has(type);
                  const count = docCounts.get(type) ?? 0;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggle(type)}
                      className={cn(
                        "relative rounded-xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30",
                      )}
                    >
                      {/* Checkmark */}
                      <div
                        className={cn(
                          "absolute right-3 top-3 flex size-5 items-center justify-center rounded-full transition-all",
                          isSelected
                            ? "bg-primary text-white"
                            : "border border-border bg-secondary",
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>

                      <div className="pr-8">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{info.label}</span>
                          {count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {count}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <p className="mt-6 text-sm text-muted-foreground text-right">
          {selected.size} document type{selected.size !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
