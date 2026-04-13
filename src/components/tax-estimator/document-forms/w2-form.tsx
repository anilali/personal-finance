import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { w2Schema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyField } from "./form-field-helpers";
import { STATES } from "@/lib/tax-estimator/tax-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type W2FormData = z.infer<typeof w2Schema>;

interface W2FormProps {
  defaultValues?: Partial<W2FormData>;
  onSubmit: (data: W2FormData) => Promise<void>;
  onDelete?: () => void;
}

export function W2Form({ defaultValues, onSubmit, onDelete }: W2FormProps) {
  const form = useForm<W2FormData>({
    resolver: zodResolver(w2Schema),
    defaultValues: {
      wages: 0,
      federalWithheld: 0,
      socialSecurityWages: 0,
      socialSecurityWithheld: 0,
      medicareWages: 0,
      medicareWithheld: 0,
      stateWages: 0,
      stateWithheld: 0,
      stateCode: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Box 1 — Wages, tips, compensation" name="wages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 2 — Federal tax withheld" name="federalWithheld" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 3 — Social Security wages" name="socialSecurityWages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 4 — Social Security tax withheld" name="socialSecurityWithheld" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 5 — Medicare wages" name="medicareWages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 6 — Medicare tax withheld" name="medicareWithheld" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 16 — State wages" name="stateWages" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 17 — State income tax" name="stateWithheld" register={form.register} errors={form.formState.errors} />
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label>Box 15 — State</Label>
        <Select
          value={form.watch("stateCode")}
          onValueChange={(v) => form.setValue("stateCode", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state..." />
          </SelectTrigger>
          <SelectContent>
            {STATES.map((s) => (
              <SelectItem key={s.code} value={s.code}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
