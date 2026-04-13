import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UseFormRegister, FieldErrors } from "react-hook-form";

interface MoneyFieldProps {
  label: string;
  name: string;
  register: UseFormRegister<any>;
  errors: FieldErrors;
  hint?: string;
}

export function MoneyField({ label, name, register, errors, hint }: MoneyFieldProps) {
  const error = name.split(".").reduce((obj: any, key) => obj?.[key], errors);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={name}
          type="number"
          step="0.01"
          min="0"
          className="pl-7"
          {...register(name, { valueAsNumber: true })}
        />
      </div>
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error.message as string}</p>
      )}
    </div>
  );
}
