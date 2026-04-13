import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { b1099Schema } from "@/lib/tax-estimator/schemas";
import { z } from "zod/v3";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MoneyField } from "./form-field-helpers";

type FormData = z.infer<typeof b1099Schema>;

interface Props {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onDelete?: () => void;
}

export function B1099Form({ defaultValues, onSubmit, onDelete }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(b1099Schema),
    defaultValues: {
      proceeds: 0,
      costBasis: 0,
      isLongTerm: false,
      federalWithheld: 0,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyField label="Box 1d — Proceeds" name="proceeds" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 1e — Cost or other basis" name="costBasis" register={form.register} errors={form.formState.errors} />
        <MoneyField label="Box 4 — Federal tax withheld" name="federalWithheld" register={form.register} errors={form.formState.errors} />
      </div>
      <div className="space-y-1.5">
        <Label>Holding Period</Label>
        <RadioGroup
          value={form.watch("isLongTerm") ? "long" : "short"}
          onValueChange={(v) => form.setValue("isLongTerm", v === "long")}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="short" id="b-short" />
            <Label htmlFor="b-short" className="font-normal cursor-pointer">Short-term (1 year or less)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="long" id="b-long" />
            <Label htmlFor="b-long" className="font-normal cursor-pointer">Long-term (more than 1 year)</Label>
          </div>
        </RadioGroup>
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
