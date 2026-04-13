import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mortgage1098Schema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { MoneyField } from "./form-field-helpers";

type FormData = z.infer<typeof mortgage1098Schema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onDelete?: () => void;
}

export function Mortgage1098Form({ defaultValues, onSubmit, onDelete }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(mortgage1098Schema),
    defaultValues: {
      mortgageInterest: 0,
      mortgageInsurancePremiums: 0,
      pointsPaid: 0,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Box 1 — Mortgage interest received" name="mortgageInterest" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 5 — Mortgage insurance premiums" name="mortgageInsurancePremiums" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 6 — Points paid on purchase" name="pointsPaid" register={form.register} errors={form.formState.errors} />
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
