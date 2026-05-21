import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { bulkCreateVestEvents } from "@/lib/equity-tracker/server-fns";
import {
  generateSchedule,
  generateDateRangeSchedule,
  type GeneratedVestEvent,
} from "@/lib/equity-tracker/utils";
import { formatShares, formatDate } from "@/lib/equity-tracker/utils";

interface ScheduleGeneratorProps {
  open: boolean;
  onClose: () => void;
  grantId: string;
  totalShares: number;
  existingVestCount: number;
}

type GeneratorMode = "standard" | "date-range";

export function ScheduleGenerator({
  open,
  onClose,
  grantId,
  totalShares,
  existingVestCount,
}: ScheduleGeneratorProps) {
  const router = useRouter();
  const [mode, setMode] = useState<GeneratorMode>("standard");
  const [preview, setPreview] = useState<GeneratedVestEvent[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Standard mode state
  const [vestingStart, setVestingStart] = useState("");
  const [totalMonths, setTotalMonths] = useState(48);
  const [cliffMonths, setCliffMonths] = useState(12);
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "annually">("monthly");
  const [remainderStrategy, setRemainderStrategy] = useState<"last" | "first">("last");

  // Date-range mode state
  const [firstVestDate, setFirstVestDate] = useState("");
  const [lastVestDate, setLastVestDate] = useState("");
  const [sharesPerVest, setSharesPerVest] = useState(0);
  const [rangeFrequency, setRangeFrequency] = useState<"monthly" | "quarterly" | "annually">("monthly");

  const resetState = () => {
    setPreview(null);
    setVestingStart("");
    setTotalMonths(48);
    setCliffMonths(12);
    setFrequency("monthly");
    setRemainderStrategy("last");
    setFirstVestDate("");
    setLastVestDate("");
    setSharesPerVest(0);
    setRangeFrequency("monthly");
  };

  const handlePreviewStandard = () => {
    if (!vestingStart) { toast.error("Vesting start date is required"); return; }
    if (totalMonths < 1) { toast.error("Total months must be at least 1"); return; }
    const events = generateSchedule({
      vestingStart,
      totalShares,
      totalMonths,
      cliffMonths,
      frequency,
      remainderStrategy,
    });
    setPreview(events);
  };

  const handlePreviewDateRange = () => {
    if (!firstVestDate) { toast.error("First vest date is required"); return; }
    if (!lastVestDate) { toast.error("Last vest date is required"); return; }
    if (firstVestDate > lastVestDate) { toast.error("First date must be before last date"); return; }
    if (sharesPerVest <= 0) { toast.error("Shares per vest must be greater than 0"); return; }
    const events = generateDateRangeSchedule({
      firstVestDate,
      lastVestDate,
      sharesPerVest,
      frequency: rangeFrequency,
    });
    setPreview(events);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await bulkCreateVestEvents({ data: { grantId, events: preview } });
      toast.success(`Generated ${preview.length} vest events`);
      router.invalidate();
      onClose();
      resetState();
    } catch {
      toast.error("Failed to generate schedule");
    } finally {
      setSaving(false);
    }
  };

  const previewTotal = preview?.reduce((s, e) => s + e.shares, 0) ?? 0;
  const sharesMatch = previewTotal === totalShares;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { onClose(); resetState(); }
      }}
    >
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Vesting Schedule</DialogTitle>
          <DialogDescription>
            Choose a method, configure parameters, and preview before applying.
            {existingVestCount > 0 && (
              <span className="mt-1 block text-amber-600">
                This grant already has {existingVestCount} vest event(s). New events will be added alongside them.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            {/* Mode tabs */}
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              <button
                onClick={() => setMode("standard")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === "standard"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Standard (cliff + periodic)
              </button>
              <button
                onClick={() => setMode("date-range")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === "date-range"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Date range
              </button>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Total grant shares</p>
              <p className="text-lg font-semibold">{formatShares(totalShares)}</p>
            </div>

            {mode === "standard" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Vesting start date</Label>
                  <Input
                    type="date"
                    value={vestingStart}
                    onChange={(e) => setVestingStart(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Total months</Label>
                    <Input
                      type="number"
                      min="1"
                      value={totalMonths}
                      onChange={(e) => setTotalMonths(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cliff months</Label>
                    <Input
                      type="number"
                      min="0"
                      value={cliffMonths}
                      onChange={(e) => setCliffMonths(Number(e.target.value))}
                    />
                    <p className="text-[11px] text-muted-foreground">0 = no cliff</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Vesting frequency</Label>
                    <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Uneven remainder</Label>
                    <Select value={remainderStrategy} onValueChange={(v) => setRemainderStrategy(v as any)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last">Add to last vest</SelectItem>
                        <SelectItem value="first">Add to first vest</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Where extra shares go if total doesn't divide evenly
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handlePreviewStandard}>Preview Schedule</Button>
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>First vest date</Label>
                    <Input
                      type="date"
                      value={firstVestDate}
                      onChange={(e) => setFirstVestDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last vest date</Label>
                    <Input
                      type="date"
                      value={lastVestDate}
                      onChange={(e) => setLastVestDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Shares per vest</Label>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      value={sharesPerVest || ""}
                      onChange={(e) => setSharesPerVest(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <Select value={rangeFrequency} onValueChange={(v) => setRangeFrequency(v as any)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handlePreviewDateRange}>Preview Schedule</Button>
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!sharesMatch && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                <p className="font-semibold">Schedule total doesn't match grant</p>
                <p className="mt-0.5">
                  Schedule: {formatShares(previewTotal)} shares — Grant: {formatShares(totalShares)} shares
                  ({previewTotal > totalShares ? "+" : ""}{formatShares(previewTotal - totalShares)} difference).
                  You can still apply this and adjust individual events afterward.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Badge variant={sharesMatch ? "secondary" : "destructive"}>
                {formatShares(previewTotal)} / {formatShares(totalShares)} shares
              </Badge>
              <span className="text-xs text-muted-foreground">
                {preview.length} vest events
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">Shares</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((event, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2">{formatDate(event.vestDate)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatShares(event.shares)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? "Generating..." : "Confirm & Create Events"}
              </Button>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Back
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
