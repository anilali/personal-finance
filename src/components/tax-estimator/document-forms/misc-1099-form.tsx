import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { misc1099Schema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { MoneyField } from "./form-field-helpers";

type FormData = z.infer<typeof misc1099Schema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onDelete?: () => void;
}

export function Misc1099Form({ defaultValues, onSubmit, onDelete }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(misc1099Schema),
    defaultValues: {
      rents: 0,
      royalties: 0,
      otherIncome: 0,
      federalWithheld: 0,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Box 1 — Rents" name="rents" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 2 — Royalties" name="royalties" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 3 — Other income" name="otherIncome" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 4 — Federal tax withheld" name="federalWithheld" register={form.register} errors={form.formState.errors} />
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
