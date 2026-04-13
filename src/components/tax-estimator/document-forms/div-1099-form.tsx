import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { div1099Schema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { MoneyField } from "./form-field-helpers";

type FormData = z.infer<typeof div1099Schema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onDelete?: () => void;
}

export function Div1099Form({ defaultValues, onSubmit, onDelete }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(div1099Schema),
    defaultValues: {
      ordinaryDividends: 0,
      qualifiedDividends: 0,
      capitalGainDistributions: 0,
      federalWithheld: 0,
      stateWithheld: 0,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Box 1a — Total ordinary dividends" name="ordinaryDividends" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 1b — Qualified dividends" name="qualifiedDividends" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 2a — Capital gain distributions" name="capitalGainDistributions" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 4 — Federal tax withheld" name="federalWithheld" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 16 — State tax withheld" name="stateWithheld" register={form.register} errors={form.formState.errors} />
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
