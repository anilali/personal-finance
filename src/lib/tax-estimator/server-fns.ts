import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { estimates, estimateDocuments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { computeFullEstimate } from "./calculator";
import type {
  FilingStatus,
  EstimateType,
  ItemizedDeductions,
  PaymentEntries,
  PaymentEntry,
  QuarterlyPaymentsMade,
  TaxCalculationResult,
  EstimateWithDocuments,
  Estimate,
  EstimateDocument,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────

const DEFAULT_PAYMENTS: QuarterlyPaymentsMade = { q1: 0, q2: 0, q3: 0, q4: 0 };

function computeQuarterlyTotals(entries: PaymentEntry[]): QuarterlyPaymentsMade {
  const totals: QuarterlyPaymentsMade = { q1: 0, q2: 0, q3: 0, q4: 0 };
  for (const entry of entries) {
    if (!entry.date || !entry.amount) continue;
    const month = new Date(entry.date + "T12:00:00").getMonth();
    if (month < 3) totals.q1 += entry.amount;
    else if (month < 6) totals.q2 += entry.amount;
    else if (month < 9) totals.q3 += entry.amount;
    else totals.q4 += entry.amount;
  }
  return totals;
}

function toEstimate(row: typeof estimates.$inferSelect): Estimate {
  return {
    ...row,
    estimateType: row.estimateType as EstimateType,
    filingStatus: row.filingStatus as FilingStatus,
    priorYearTax: Number(row.priorYearTax ?? 0),
    priorYearStateTax: Number(row.priorYearStateTax ?? 0),
    capitalLossCarryforward: Number(row.capitalLossCarryforward ?? 0),
    paymentEntries: (row.paymentEntries as PaymentEntries) ?? [],
    quarterlyPaymentsMade: row.paymentEntries
      ? computeQuarterlyTotals(row.paymentEntries as PaymentEntry[])
      : (row.quarterlyPaymentsMade as QuarterlyPaymentsMade) ?? DEFAULT_PAYMENTS,
    selectedDocumentTypes: (row.selectedDocumentTypes as Estimate["selectedDocumentTypes"]) ?? [],
    itemizedDeductions: row.itemizedDeductions as ItemizedDeductions | null,
  };
}

function toDocument(row: typeof estimateDocuments.$inferSelect): EstimateDocument {
  return {
    ...row,
    documentType: row.documentType as EstimateDocument["documentType"],
    data: row.data as Record<string, any>,
  };
}

// ── List all estimates ───────────────────────────────────────────

export const getEstimates = createServerFn({ method: "GET" }).handler(
  async (): Promise<Estimate[]> => {
    const rows = await db.select().from(estimates).orderBy(desc(estimates.updatedAt));
    return rows.map(toEstimate);
  },
);

// ── Get single estimate with documents ───────────────────────────

export const getEstimate = createServerFn({ method: "GET" })
  .inputValidator((input: { estimateId: string }) => input)
  .handler(async ({ data }): Promise<EstimateWithDocuments | null> => {
    const [row] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.id, data.estimateId));

    if (!row) return null;

    const docRows = await db
      .select()
      .from(estimateDocuments)
      .where(eq(estimateDocuments.estimateId, data.estimateId));

    return {
      ...toEstimate(row),
      documents: docRows.map(toDocument),
    };
  });

// ── Create estimate ──────────────────────────────────────────────

export const createEstimate = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name: string;
      taxYear: number;
      estimateType: string;
      filingStatus: string;
      state: string;
      currentQuarter?: number;
      priorYearTax?: number;
      priorYearStateTax?: number;
      capitalLossCarryforward?: number;
      quarterlyPaymentsMade?: QuarterlyPaymentsMade;
    }) => input,
  )
  .handler(async ({ data }): Promise<Estimate> => {
    const [row] = await db
      .insert(estimates)
      .values({
        name: data.name,
        taxYear: data.taxYear,
        estimateType: data.estimateType as EstimateType,
        filingStatus: data.filingStatus as FilingStatus,
        state: data.state,
        currentQuarter: data.currentQuarter ?? 1,
        priorYearTax: String(data.priorYearTax ?? 0),
        priorYearStateTax: String(data.priorYearStateTax ?? 0),
        capitalLossCarryforward: String(data.capitalLossCarryforward ?? 0),
        quarterlyPaymentsMade: data.quarterlyPaymentsMade ?? DEFAULT_PAYMENTS,
      })
      .returning();
    return toEstimate(row);
  });

// ── Update estimate ──────────────────────────────────────────────

export const updateEstimate = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      taxYear?: number;
      filingStatus?: string;
      state?: string;
      currentQuarter?: number;
      priorYearTax?: number;
      priorYearStateTax?: number;
      capitalLossCarryforward?: number;
      paymentEntries?: PaymentEntries;
      quarterlyPaymentsMade?: QuarterlyPaymentsMade;
      selectedDocumentTypes?: string[];
      useItemizedDeductions?: boolean;
      itemizedDeductions?: ItemizedDeductions | null;
    }) => input,
  )
  .handler(async ({ data }): Promise<Estimate> => {
    const { id, ...fields } = data;
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (fields.name !== undefined) updateData.name = fields.name;
    if (fields.taxYear !== undefined) updateData.taxYear = fields.taxYear;
    if (fields.filingStatus !== undefined) updateData.filingStatus = fields.filingStatus;
    if (fields.state !== undefined) updateData.state = fields.state;
    if (fields.currentQuarter !== undefined) updateData.currentQuarter = fields.currentQuarter;
    if (fields.priorYearTax !== undefined) updateData.priorYearTax = String(fields.priorYearTax);
    if (fields.priorYearStateTax !== undefined) updateData.priorYearStateTax = String(fields.priorYearStateTax);
    if (fields.capitalLossCarryforward !== undefined) updateData.capitalLossCarryforward = String(fields.capitalLossCarryforward);
    if (fields.paymentEntries !== undefined) {
      updateData.paymentEntries = fields.paymentEntries;
      updateData.quarterlyPaymentsMade = computeQuarterlyTotals(fields.paymentEntries);
    }
    if (fields.quarterlyPaymentsMade !== undefined)
      updateData.quarterlyPaymentsMade = fields.quarterlyPaymentsMade;
    if (fields.selectedDocumentTypes !== undefined)
      updateData.selectedDocumentTypes = fields.selectedDocumentTypes;
    if (fields.useItemizedDeductions !== undefined)
      updateData.useItemizedDeductions = fields.useItemizedDeductions;
    if (fields.itemizedDeductions !== undefined)
      updateData.itemizedDeductions = fields.itemizedDeductions;

    const [row] = await db
      .update(estimates)
      .set(updateData)
      .where(eq(estimates.id, id))
      .returning();
    return toEstimate(row);
  });

// ── Delete estimate ──────────────────────────────────────────────

export const deleteEstimate = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.delete(estimates).where(eq(estimates.id, data.id));
    return { success: true };
  });

// ── Upsert document ─────────────────────────────────────────────

export const upsertDocument = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      estimateId: string;
      documentType: string;
      label?: string | null;
      data: Record<string, any>;
    }) => input,
  )
  .handler(async ({ data }): Promise<EstimateDocument> => {
    if (data.id) {
      const [row] = await db
        .update(estimateDocuments)
        .set({
          label: data.label ?? null,
          data: data.data,
        })
        .where(eq(estimateDocuments.id, data.id))
        .returning();
      return toDocument(row);
    }

    const [row] = await db
      .insert(estimateDocuments)
      .values({
        estimateId: data.estimateId,
        documentType: data.documentType as EstimateDocument["documentType"],
        label: data.label ?? null,
        data: data.data,
      })
      .returning();
    return toDocument(row);
  });

// ── Delete document ──────────────────────────────────────────────

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await db.delete(estimateDocuments).where(eq(estimateDocuments.id, data.id));
    return { success: true };
  });

// ── Calculate tax ────────────────────────────────────────────────

export const calculateTax = createServerFn({ method: "GET" })
  .inputValidator((input: { estimateId: string }) => input)
  .handler(async ({ data }): Promise<TaxCalculationResult | null> => {
    const [row] = await db
      .select()
      .from(estimates)
      .where(eq(estimates.id, data.estimateId));

    if (!row) return null;

    const docRows = await db
      .select()
      .from(estimateDocuments)
      .where(eq(estimateDocuments.estimateId, data.estimateId));

    const est = toEstimate(row);
    const documents = docRows.map(toDocument);

    return computeFullEstimate(
      documents,
      est.filingStatus,
      est.taxYear,
      est.state,
      est.useItemizedDeductions,
      est.itemizedDeductions,
      est.currentQuarter,
      est.quarterlyPaymentsMade,
      est.capitalLossCarryforward,
      est.priorYearTax,
      est.priorYearStateTax,
      est.paymentEntries,
    );
  });
