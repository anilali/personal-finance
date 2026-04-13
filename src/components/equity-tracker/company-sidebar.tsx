import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Building2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deleteCompany } from "@/lib/equity-tracker/server-fns";
import type { Company } from "@/lib/equity-tracker/types";
import { formatCurrency } from "@/lib/equity-tracker/utils";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

interface CompanySidebarProps {
  companies: Company[];
  selectedCompanyId?: string;
  onAddCompany: () => void;
}

export function CompanySidebar({
  companies,
  selectedCompanyId,
  onAddCompany,
}: CompanySidebarProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelect = (companyId: string) => {
    navigate({
      to: "/equity-tracker",
      search: { company: companyId },
    });
  };

  const handleDelete = async (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this company and all its grants? This cannot be undone.")) return;
    setDeletingId(companyId);
    try {
      await deleteCompany({ data: { id: companyId } });
      toast.success("Company deleted");
      router.invalidate();
      if (selectedCompanyId === companyId) {
        navigate({ to: "/equity-tracker", search: {} });
      }
    } catch {
      toast.error("Failed to delete company");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Companies</h2>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAddCompany}>
          <Plus className="size-4" />
        </Button>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <Building2 className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">No companies yet</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onAddCompany}>
            Add company
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleSelect(company.id)}
              disabled={deletingId === company.id}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                selectedCompanyId === company.id
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-secondary",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{company.name}</p>
                <div className="flex items-center gap-2">
                  {company.ticker && (
                    <span className="text-xs text-muted-foreground">{company.ticker}</span>
                  )}
                  {company.currentPrice != null && (
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(company.currentPrice)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!company.isCurrent && (
                  <Badge variant="outline" className="text-[10px]">Former</Badge>
                )}
                <button
                  onClick={(e) => handleDelete(e, company.id)}
                  className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
