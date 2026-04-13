import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { form8949Schema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { MoneyField } from "./form-field-helpers";
import { Plus, Trash2 } from "lucide-react";

type FormData = z.infer<typeof form8949Schema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onDelete?: () => void;
}

export function Form8949Form({ defaultValues, onSubmit, onDelete }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(form8949Schema),
    defaultValues: {
      entryMode: "summary",
      shortTermProceeds: 0,
      shortTermCostBasis: 0,
      longTermProceeds: 0,
      longTermCostBasis: 0,
      transactions: [],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "transactions",
  });

  const entryMode = form.watch("entryMode");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Entry Mode</Label>
        <RadioGroup
          value={entryMode}
          onValueChange={(v) => form.setValue("entryMode", v as "summary" | "detailed")}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="summary" id="mode-summary" />
            <Label htmlFor="mode-summary" className="font-normal cursor-pointer">
              Summary totals
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="detailed" id="mode-detailed" />
            <Label htmlFor="mode-detailed" className="font-normal cursor-pointer">
              Individual transactions
            </Label>
          </div>
        </RadioGroup>
      </div>

      {entryMode === "summary" ? (
        <div className="space-y-4">
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Short-Term</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField label="Total proceeds" name="shortTermProceeds" register={form.register} errors={form.formState.errors} />
              <MoneyField label="Total cost basis" name="shortTermCostBasis" register={form.register} errors={form.formState.errors} />
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Long-Term</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField label="Total proceeds" name="longTermProceeds" register={form.register} errors={form.formState.errors} />
              <MoneyField label="Total cost basis" name="longTermCostBasis" register={form.register} errors={form.formState.errors} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-border/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">Transaction {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Description</Label>
                  <Input
                    placeholder="e.g. 100 shares AAPL"
                    {...form.register(`transactions.${index}.description`)}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MoneyField label="Proceeds" name={`transactions.${index}.proceeds`} register={form.register} errors={form.formState.errors} />
                  <MoneyField label="Cost basis" name={`transactions.${index}.costBasis`} register={form.register} errors={form.formState.errors} />
                </div>
                <RadioGroup
                  value={form.watch(`transactions.${index}.isLongTerm`) ? "long" : "short"}
                  onValueChange={(v) => form.setValue(`transactions.${index}.isLongTerm`, v === "long")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="short" id={`tx-${index}-short`} />
                    <Label htmlFor={`tx-${index}-short`} className="font-normal cursor-pointer text-sm">Short-term</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="long" id={`tx-${index}-long`} />
                    <Label htmlFor={`tx-${index}-long`} className="font-normal cursor-pointer text-sm">Long-term</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", proceeds: 0, costBasis: 0, isLongTerm: false })}
          >
            <Plus className="mr-1 size-3.5" />
            Add Transaction
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
        {onDelete && (
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
