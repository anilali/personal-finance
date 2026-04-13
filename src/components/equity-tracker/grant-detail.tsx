import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, Pencil, Trash2, Plus, Wand2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GrantSummaryCard } from "./grant-summary-card";
import { VestingTable } from "./vesting-table";
import { ExerciseTable } from "./exercise-table";
import { SaleTable } from "./sale-table";
import { GrantForm } from "./grant-form";
import { ScheduleGenerator } from "./schedule-generator";
import { ExerciseForm } from "./exercise-form";
import { SaleForm } from "./sale-form";
import { deleteGrant, vestAllPast, createVestEvent } from "@/lib/equity-tracker/server-fns";
import { computeGrantSummary, computeLots, formatCurrency, formatDate, formatShares } from "@/lib/equity-tracker/utils";
import type { GrantWithVesting } from "@/lib/equity-tracker/types";

interface GrantDetailProps {
  grant: GrantWithVesting;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const GRANT_TYPE_LABEL: Record<string, string> = {
  iso: "ISO",
  nso: "NSO",
};

export function GrantDetail({ grant, activeTab, onTabChange }: GrantDetailProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<typeof grant.exercises[number] | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<typeof grant.sales[number] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newShares, setNewShares] = useState("");

  const summary = computeGrantSummary(grant);
  const lots = computeLots(grant);

  const daysToExpiration = grant.expirationDate
    ? Math.ceil(
        (new Date(grant.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null;

  const scheduledShares = grant.vestEvents.reduce((s, e) => s + e.shares, 0);
  const unscheduledShares = grant.totalShares - scheduledShares;

  const handleBack = () => {
    navigate({
      to: "/equity-tracker",
      search: { company: grant.companyId },
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await vestAllPast();
      const parts: string[] = [];
      if (result.vestedCount > 0) parts.push(`${result.vestedCount} vested`);
      if (result.cancelledCount > 0) parts.push(`${result.cancelledCount} forfeited`);
      if (result.grantsUpdated > 0) parts.push(`${result.grantsUpdated} grant(s) updated`);
      const msg = parts.length > 0 ? `Synced: ${parts.join(", ")}` : "Everything is up to date";
      toast.success(msg);
      router.invalidate();
    } catch {
      toast.error("Failed to sync vests");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Cancel this grant? It will be marked as cancelled.")) return;
    try {
      await deleteGrant({ data: { id: grant.id } });
      toast.success("Grant cancelled");
      router.invalidate();
      handleBack();
    } catch {
      toast.error("Failed to cancel grant");
    }
  };

  const handleAddEvent = async () => {
    const shares = Number(newShares);
    if (!newDate || isNaN(shares) || shares <= 0) {
      toast.error("Enter a valid date and share count");
      return;
    }
    try {
      await createVestEvent({ data: { grantId: grant.id, vestDate: newDate, shares } });
      toast.success("Vest event added");
      setAddingEvent(false);
      setNewDate("");
      setNewShares("");
      router.invalidate();
    } catch {
      toast.error("Failed to add vest event");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={handleBack}
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to grants
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              {grant.grantId ?? `${GRANT_TYPE_LABEL[grant.grantType]} Grant`}
            </h2>
            {grant.grantId && (
              <Badge
                className={`text-[10px] ${
                  grant.grantType === "iso"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-amber-300 bg-amber-50 text-amber-700"
                }`}
              >
                {GRANT_TYPE_LABEL[grant.grantType]}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            <span><span className="font-semibold">Granted:</span> {formatDate(grant.grantDate)}</span>
            <span><span className="font-semibold">Strike:</span> {formatCurrency(grant.strikePrice)}</span>
            {grant.expirationDate && (
              <span><span className="font-semibold">Expires:</span> {formatDate(grant.expirationDate)}</span>
            )}
          </div>
          {grant.notes && (
            <p className="mt-2 text-sm text-muted-foreground italic">{grant.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 size-4" />
            Edit
          </Button>
        </div>
      </div>

      <Separator />

      {/* Summary */}
      <GrantSummaryCard summary={summary} daysToExpiration={daysToExpiration} />

      <Separator />

      {/* Tabs: Vesting / Exercises / Sales */}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList variant="line" className="w-full justify-start border-b border-border pb-0">
          <TabsTrigger value="vesting" className="px-4 py-2">Vesting</TabsTrigger>
          <TabsTrigger value="exercises" className="px-4 py-2">Exercises</TabsTrigger>
          <TabsTrigger value="sales" className="px-4 py-2">Sales</TabsTrigger>
        </TabsList>

        {/* Vesting tab */}
        <TabsContent value="vesting">
          <div className="space-y-3 pt-2">
            {grant.vestEvents.length > 0 && scheduledShares !== grant.totalShares && (
              <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">Schedule doesn't match grant total</p>
                <p className="mt-0.5">
                  Scheduled: {formatShares(scheduledShares)} shares — Grant: {formatShares(grant.totalShares)} shares
                  ({scheduledShares > grant.totalShares ? "+" : ""}{formatShares(scheduledShares - grant.totalShares)} difference)
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {grant.vestEvents.length > 0 && unscheduledShares !== 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatShares(scheduledShares)} / {formatShares(grant.totalShares)} shares scheduled
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`mr-1.5 size-4 ${syncing ? "animate-spin" : ""}`} />
                  Sync
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAddingEvent(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Add Event
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGeneratorOpen(true)}>
                  <Wand2 className="mr-1.5 size-4" />
                  Generate
                </Button>
              </div>
            </div>

            {addingEvent && (
              <div className="flex items-end gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-8 w-36 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Shares</label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder={unscheduledShares > 0 ? String(unscheduledShares) : ""}
                    value={newShares}
                    onChange={(e) => setNewShares(e.target.value)}
                    className="h-8 w-28 text-sm"
                  />
                </div>
                <Button size="sm" className="h-8" onClick={handleAddEvent}>Add</Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddingEvent(false); setNewDate(""); setNewShares(""); }}>
                  Cancel
                </Button>
              </div>
            )}

            <VestingTable vestEvents={grant.vestEvents} separationDate={grant.company.separationDate} />
          </div>
        </TabsContent>

        {/* Exercises tab */}
        <TabsContent value="exercises">
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatShares(summary.exercisableShares)} shares exercisable
                {summary.exercisedShares > 0 && ` — ${formatShares(summary.exercisedShares)} already exercised`}
              </span>
              {summary.exercisableShares > 0 && (
                <Button size="sm" onClick={() => setExerciseOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Log Exercise
                </Button>
              )}
            </div>
            <ExerciseTable
              exercises={grant.exercises}
              grantType={grant.grantType}
              totalCostBasis={summary.totalCostBasis}
              totalSpreadAtExercise={summary.totalSpreadAtExercise}
              onEdit={(ex) => { setEditingExercise(ex); setExerciseOpen(true); }}
            />
          </div>
        </TabsContent>

        {/* Sales tab */}
        <TabsContent value="sales">
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatShares(summary.heldShares)} shares held (exercised but not sold)
                {summary.soldShares > 0 && ` — ${formatShares(summary.soldShares)} sold`}
              </span>
              {summary.heldShares > 0 && (
                <Button size="sm" onClick={() => setSaleOpen(true)}>
                  <Plus className="mr-1.5 size-4" />
                  Log Sale
                </Button>
              )}
            </div>
            <SaleTable
              sales={grant.sales}
              lots={lots}
              grantType={grant.grantType}
              totalProceeds={summary.totalProceeds}
              totalGainLoss={summary.totalGainLoss}
              onEdit={(s) => { setEditingSale(s); setSaleOpen(true); }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GrantForm open={editOpen} onClose={() => setEditOpen(false)} companyId={grant.companyId} grant={grant} />
      <ScheduleGenerator open={generatorOpen} onClose={() => setGeneratorOpen(false)} grantId={grant.id} totalShares={grant.totalShares} existingVestCount={grant.vestEvents.length} />
      <ExerciseForm open={exerciseOpen} onClose={() => { setExerciseOpen(false); setEditingExercise(null); }} grantId={grant.id} strikePrice={grant.strikePrice} currentPrice={grant.company.currentPrice} exercisableShares={summary.exercisableShares} exercise={editingExercise} />
      <SaleForm open={saleOpen} onClose={() => { setSaleOpen(false); setEditingSale(null); }} grantId={grant.id} strikePrice={grant.strikePrice} lots={lots} sale={editingSale} />
    </div>
  );
}
