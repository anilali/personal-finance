import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { scheduleK1Schema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MoneyField } from "./form-field-helpers";

type FormData = z.infer<typeof scheduleK1Schema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onDelete?: () => void;
}

export function ScheduleK1Form({ defaultValues, onSubmit, onDelete }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(scheduleK1Schema),
    defaultValues: {
      ordinaryBusinessIncome: 0,
      netRentalIncome: 0,
      interestIncome: 0,
      dividends: 0,
      shortTermCapitalGain: 0,
      longTermCapitalGain: 0,
      netSection1231Gain: 0,
      subjectToSelfEmploymentTax: false,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Box 1 — Ordinary business income" name="ordinaryBusinessIncome" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 2 — Net rental income" name="netRentalIncome" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 5 — Interest income" name="interestIncome" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 6a — Ordinary dividends" name="dividends" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 8 — Short-term capital gain" name="shortTermCapitalGain" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 9a — Long-term capital gain" name="longTermCapitalGain" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 10 — Net section 1231 gain" name="netSection1231Gain" register={form.register} errors={form.formState.errors} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="se-tax"
          {...form.register("subjectToSelfEmploymentTax")}
          className="size-4 rounded border-border"
        />
        <Label htmlFor="se-tax" className="font-normal cursor-pointer">
          Subject to self-employment tax (general partner / active LLC member)
        </Label>
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
