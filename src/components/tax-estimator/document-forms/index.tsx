import type { DocumentType } from "@/lib/tax-estimator/types";
import { W2Form } from "./w2-form";
import { PaystubForm } from "./paystub-form";
import { Div1099Form } from "./div-1099-form";
import { Int1099Form } from "./int-1099-form";
import { Misc1099Form } from "./misc-1099-form";
import { B1099Form } from "./b-1099-form";
import { Oid1099Form } from "./oid-1099-form";
import { Nec1099Form } from "./nec-1099-form";
import { R1099Form } from "./r-1099-form";
import { Mortgage1098Form } from "./mortgage-1098-form";
import { Ira5498Form } from "./ira-5498-form";
import { Form8949Form } from "./form-8949-form";
import { BrokerageTradesForm } from "./brokerage-trades-form";
import { ScheduleK1Form } from "./schedule-k1-form";

interface DocumentFormProps {
  documentType: DocumentType;
  defaultValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onDelete?: () => void;
}

export function DocumentForm({
  documentType,
  defaultValues,
  onSubmit,
  onDelete,
}: DocumentFormProps) {
  const props = {
    defaultValues: defaultValues as any,
    onSubmit: onSubmit as any,
    onDelete,
  };

  switch (documentType) {
    case "w2":
      return <W2Form {...props} />;
    case "paystub":
      return <PaystubForm {...props} />;
    case "1099-div":
      return <Div1099Form {...props} />;
    case "1099-int":
      return <Int1099Form {...props} />;
    case "1099-misc":
      return <Misc1099Form {...props} />;
    case "1099-b":
      return <B1099Form {...props} />;
    case "1099-oid":
      return <Oid1099Form {...props} />;
    case "1099-nec":
      return <Nec1099Form {...props} />;
    case "1099-r":
      return <R1099Form {...props} />;
    case "1098":
      return <Mortgage1098Form {...props} />;
    case "5498":
      return <Ira5498Form {...props} />;
    case "8949":
      return <Form8949Form {...props} />;
    case "brokerage-trades":
      return <BrokerageTradesForm {...props} />;
    case "schedule-k1":
      return <ScheduleK1Form {...props} />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown document type</p>;
  }
}
