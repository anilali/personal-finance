import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { EquityLayout } from "@/components/equity-tracker/equity-layout";
import { CompanySidebar } from "@/components/equity-tracker/company-sidebar";
import { CompanyForm } from "@/components/equity-tracker/company-form";
import { GrantsList } from "@/components/equity-tracker/grants-list";
import { GrantDetail } from "@/components/equity-tracker/grant-detail";
import { GrantForm } from "@/components/equity-tracker/grant-form";
import {
  getCompanies,
  getCompany,
  getGrant,
} from "@/lib/equity-tracker/server-fns";

interface EquitySearch {
  company?: string;
  grant?: string;
  tab?: string;
}

export const Route = createFileRoute("/equity-tracker")({
  validateSearch: (search: Record<string, unknown>): EquitySearch => ({
    company: search.company as string | undefined,
    grant: search.grant as string | undefined,
    tab: search.tab as string | undefined,
  }),
  loaderDeps: ({ search }) => ({
    company: search.company,
    grant: search.grant,
  }),
  loader: async ({ deps }) => {
    const companies = await getCompanies();
    const selectedCompany = deps.company
      ? await getCompany({ data: { companyId: deps.company } })
      : null;
    const selectedGrant = deps.grant
      ? await getGrant({ data: { grantId: deps.grant } })
      : null;
    return { companies, selectedCompany, selectedGrant };
  },
  component: EquityTrackerPage,
});

function EquityTrackerPage() {
  const { company: companyId, grant: grantId, tab } = Route.useSearch();
  const { companies, selectedCompany, selectedGrant } = Route.useLoaderData();

  const navigate = useNavigate();
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(false);
  const [grantFormOpen, setGrantFormOpen] = useState(false);

  const handleGrantCreated = (newGrantId: string) => {
    navigate({
      to: "/equity-tracker",
      search: { company: companyId, grant: newGrantId },
    });
  };

  // Content area rendering
  let content: React.ReactNode;

  if (grantId && selectedGrant) {
    // Grant detail view
    content = (
      <GrantDetail
        grant={selectedGrant}
        activeTab={tab ?? "vesting"}
        onTabChange={(t) => navigate({ to: "/equity-tracker", search: { company: companyId, grant: grantId, tab: t } })}
      />
    );
  } else if (companyId && selectedCompany) {
    // Company grants list
    content = (
      <GrantsList
        company={selectedCompany}
        selectedGrantId={grantId}
        onAddGrant={() => setGrantFormOpen(true)}
        onEditCompany={() => setEditingCompany(true)}
      />
    );
  } else {
    // Empty state
    content = (
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-4 rounded-full bg-secondary p-4">
            <TrendingUp className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Select a Company</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Choose a company from the sidebar to view and manage your option
            grants, or add a new company to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-accent shadow-sm">
          <TrendingUp className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Equity Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your stock options, vesting schedules, and valuations
          </p>
        </div>
      </div>

      <EquityLayout
        sidebar={
          <CompanySidebar
            companies={companies}
            selectedCompanyId={companyId}
            onAddCompany={() => setCompanyFormOpen(true)}
          />
        }
      >
        {content}
      </EquityLayout>

      {/* Add / Edit Company dialog */}
      <CompanyForm
        open={companyFormOpen || editingCompany}
        onClose={() => {
          setCompanyFormOpen(false);
          setEditingCompany(false);
        }}
        company={editingCompany ? selectedCompany : null}
      />

      {/* Add Grant dialog */}
      {selectedCompany && (
        <GrantForm
          open={grantFormOpen}
          onClose={() => setGrantFormOpen(false)}
          companyId={selectedCompany.id}
          onCreated={handleGrantCreated}
        />
      )}
    </div>
  );
}
