import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, FileText, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DocumentForm } from "@/components/tax-estimator/document-forms";
import { upsertDocument, deleteDocument } from "@/lib/tax-estimator/server-fns";
import { DOCUMENT_TYPE_INFO } from "@/lib/tax-estimator/tax-data";
import { cn } from "@/lib/utils";
import type { DocumentType, EstimateWithDocuments, EstimateDocument } from "@/lib/tax-estimator/types";

interface DocumentDetailsProps {
  estimate: EstimateWithDocuments;
}

type EditorState =
  | { mode: "idle" }
  | { mode: "new"; docType: DocumentType }
  | { mode: "edit"; doc: EstimateDocument };

export function DocumentDetails({ estimate }: DocumentDetailsProps) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>({ mode: "idle" });
  const [newDocType, setNewDocType] = useState<string>("");
  const [editLabel, setEditLabel] = useState("");

  // Sort documents by creation order
  const docs = [...estimate.documents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Filter available types by estimate type and selection
  const selectedTypes = new Set(estimate.selectedDocumentTypes);
  const availableTypes = (Object.keys(DOCUMENT_TYPE_INFO) as DocumentType[]).filter(
    (t) =>
      DOCUMENT_TYPE_INFO[t]?.estimateTypes.includes(estimate.estimateType) &&
      (selectedTypes.size === 0 || selectedTypes.has(t)),
  );

  const handleSave = async (
    docType: DocumentType,
    data: Record<string, any>,
    existingId?: string,
  ) => {
    try {
      await upsertDocument({
        data: {
          id: existingId,
          estimateId: estimate.id,
          documentType: docType,
          label: editLabel || null,
          data,
        },
      });
      toast.success(existingId ? "Updated" : "Saved");
      setEditor({ mode: "idle" });
      setEditLabel("");
      router.invalidate();
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteDocument({ data: { id: docId } });
      toast.success("Deleted");
      if (editor.mode === "edit" && editor.doc.id === docId) {
        setEditor({ mode: "idle" });
      }
      router.invalidate();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const startNew = () => {
    if (!newDocType) return;
    setEditor({ mode: "new", docType: newDocType as DocumentType });
    setEditLabel("");
    setNewDocType("");
  };

  const startEdit = (doc: EstimateDocument) => {
    setEditor({ mode: "edit", doc });
    setEditLabel(doc.label ?? "");
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Enter Your Income & Tax Info</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add the amounts from your {estimate.estimateType === "quarterly" ? "paystubs and statements" : "tax documents"} for {estimate.taxYear}
        </p>
      </div>

      {/* Warning for missing document types */}
      {(() => {
        const savedTypes = new Set(docs.map((d) => d.documentType));
        const missing = estimate.selectedDocumentTypes.filter((t) => !savedTypes.has(t));
        if (missing.length === 0) return null;
        return (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <span className="text-amber-800 dark:text-amber-200">
                Missing entries for:{" "}
                {missing.map((t) => DOCUMENT_TYPE_INFO[t]?.label ?? t).join(", ")}
              </span>
            </div>
          </div>
        );
      })()}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Left panel: document list ── */}
        <div className="w-full lg:w-80 shrink-0">
          {/* Add new */}
          <div className="flex gap-2 mb-4">
            <Select value={newDocType} onValueChange={setNewDocType}>
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue placeholder="Add income source..." />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => {
                  const info = DOCUMENT_TYPE_INFO[type];
                  return (
                    <SelectItem key={type} value={type}>
                      {info?.label ?? type}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={startNew} disabled={!newDocType}>
              <Plus className="size-4" />
            </Button>
          </div>

          {/* Document list */}
          {docs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <FileText className="mx-auto mb-2 size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the dropdown above to add one
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {docs.map((doc) => {
                const info = DOCUMENT_TYPE_INFO[doc.documentType];
                const isActive =
                  (editor.mode === "edit" && editor.doc.id === doc.id);

                return (
                  <div
                    key={doc.id}
                    className={cn(
                      "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary",
                    )}
                    onClick={() => startEdit(doc)}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {info?.label ?? doc.documentType}
                        </span>
                        {doc.label && (
                          <span className="text-xs text-muted-foreground truncate">
                            — {doc.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right panel: form ── */}
        <div className="flex-1 min-w-0">
          {editor.mode === "idle" && (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
              <div>
                <Pencil className="mx-auto mb-2 size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {docs.length === 0
                    ? "Add an income source to get started"
                    : "Select an entry to edit, or add a new one"}
                </p>
              </div>
            </div>
          )}

          {editor.mode === "new" && (
            <div className="rounded-lg border border-border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">
                  New {DOCUMENT_TYPE_INFO[editor.docType]?.label ?? editor.docType}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditor({ mode: "idle" })}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="mb-4">
                <Label className="text-sm">Label (optional)</Label>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. Fidelity, Employer ABC"
                  className="mt-1 max-w-xs h-8 text-sm"
                />
              </div>
              <DocumentForm
                documentType={editor.docType}
                onSubmit={async (data) => {
                  await handleSave(editor.docType, data);
                }}
                onDelete={() => setEditor({ mode: "idle" })}
              />
            </div>
          )}

          {editor.mode === "edit" && (
            <div className="rounded-lg border border-border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">
                  {DOCUMENT_TYPE_INFO[editor.doc.documentType]?.label ?? editor.doc.documentType}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditor({ mode: "idle" })}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="mb-4">
                <Label className="text-sm">Label (optional)</Label>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. Fidelity, Employer ABC"
                  className="mt-1 max-w-xs h-8 text-sm"
                />
              </div>
              <DocumentForm
                key={editor.doc.id}
                documentType={editor.doc.documentType}
                defaultValues={editor.doc.data}
                onSubmit={async (data) => {
                  await handleSave(
                    editor.doc.documentType,
                    data,
                    editor.doc.id,
                  );
                }}
                onDelete={() => handleDelete(editor.doc.id)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
