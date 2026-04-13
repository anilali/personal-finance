import { z } from "zod/v3";

// ── Helpers ──────────────────────────────────────────────────────

const money = z.number().min(0);

// ── Estimate CRUD ────────────────────────────────────────────────

export const filingStatusSchema = z.enum([
  "single",
  "mfj",
  "mfs",
  "hoh",
  "qss",
]);

export const documentTypeSchema = z.enum([
  "w2",
  "paystub",
  "1099-div",
  "1099-int",
  "1099-misc",
  "1099-b",
  "1099-oid",
  "1099-nec",
  "1099-r",
  "1098",
  "5498",
  "8949",
  "brokerage-trades",
  "schedule-k1",
]);

export const createEstimateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  taxYear: z.number().int().min(2024).max(2026),
  filingStatus: filingStatusSchema,
  state: z.string().length(2, "Must be a 2-letter state code"),
});

export const updateEstimateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  taxYear: z.number().int().min(2024).max(2026).optional(),
  filingStatus: filingStatusSchema.optional(),
  state: z.string().length(2).optional(),
  useItemizedDeductions: z.boolean().optional(),
  itemizedDeductions: z
    .object({
      mortgageInterest: money,
      stateLocalTaxes: money,
      charitableContributions: money,
      medicalExpenses: money,
      otherDeductions: money,
    })
    .nullable()
    .optional(),
});

// ── Document schemas ─────────────────────────────────────────────
// NOTE: No .default() — form defaultValues handles initial values.
// This avoids Input/Output type mismatches with @hookform/resolvers.

export const w2Schema = z.object({
  wages: money,
  federalWithheld: money,
  socialSecurityWages: money,
  socialSecurityWithheld: money,
  medicareWages: money,
  medicareWithheld: money,
  stateWages: money,
  stateWithheld: money,
  stateCode: z.string(),
});

export const paystubSchema = z.object({
  payPeriodsCompleted: z.number().int().min(1),
  totalPayPeriods: z.number().int().min(1),
  ytdWages: money,
  ytdFederalWithheld: money,
  ytdSocialSecurityWages: money,
  ytdSocialSecurityWithheld: money,
  ytdMedicareWages: money,
  ytdMedicareWithheld: money,
  ytdStateWages: money,
  ytdStateWithheld: money,
  stateCode: z.string(),
});

export const div1099Schema = z.object({
  ordinaryDividends: money,
  qualifiedDividends: money,
  capitalGainDistributions: money,
  federalWithheld: money,
  stateWithheld: money,
});

export const int1099Schema = z.object({
  interestIncome: money,
  federalWithheld: money,
  taxExemptInterest: money,
  stateWithheld: money,
});

export const misc1099Schema = z.object({
  rents: money,
  royalties: money,
  otherIncome: money,
  federalWithheld: money,
});

export const b1099Schema = z.object({
  proceeds: money,
  costBasis: money,
  isLongTerm: z.boolean(),
  federalWithheld: money,
});

export const oid1099Schema = z.object({
  originalIssueDiscount: money,
  otherPeriodicInterest: money,
  federalWithheld: money,
});

export const nec1099Schema = z.object({
  nonemployeeCompensation: money,
  federalWithheld: money,
});

export const r1099Schema = z.object({
  grossDistribution: money,
  taxableAmount: money,
  federalWithheld: money,
  stateWithheld: money,
});

export const mortgage1098Schema = z.object({
  mortgageInterest: money,
  mortgageInsurancePremiums: money,
  pointsPaid: money,
});

export const ira5498Schema = z.object({
  iraContributions: money,
  rothContributions: money,
  sepContributions: money,
});

export const form8949TransactionSchema = z.object({
  description: z.string(),
  proceeds: money,
  costBasis: money,
  isLongTerm: z.boolean(),
});

export const form8949Schema = z.object({
  entryMode: z.enum(["summary", "detailed"]),
  shortTermProceeds: money,
  shortTermCostBasis: money,
  longTermProceeds: money,
  longTermCostBasis: money,
  transactions: z.array(form8949TransactionSchema),
});

export const brokerageTradeSchema = z.object({
  ticker: z.string().min(1),
  shares: z.number().min(0),
  buyDate: z.string().min(1),
  sellDate: z.string().min(1),
  buyPrice: z.number().min(0),
  sellPrice: z.number().min(0),
});

export const brokerageTradesSchema = z.object({
  trades: z.array(brokerageTradeSchema),
});

export const scheduleK1Schema = z.object({
  ordinaryBusinessIncome: money,
  netRentalIncome: money,
  interestIncome: money,
  dividends: money,
  shortTermCapitalGain: money,
  longTermCapitalGain: money,
  netSection1231Gain: money,
  subjectToSelfEmploymentTax: z.boolean(),
});

export const itemizedDeductionsSchema = z.object({
  mortgageInterest: money,
  stateLocalTaxes: money,
  charitableContributions: money,
  medicalExpenses: money,
  otherDeductions: money,
});

// ── Document schema registry ─────────────────────────────────────

export const documentSchemas = {
  w2: w2Schema,
  paystub: paystubSchema,
  "1099-div": div1099Schema,
  "1099-int": int1099Schema,
  "1099-misc": misc1099Schema,
  "1099-b": b1099Schema,
  "1099-oid": oid1099Schema,
  "1099-nec": nec1099Schema,
  "1099-r": r1099Schema,
  "1098": mortgage1098Schema,
  "5498": ira5498Schema,
  "8949": form8949Schema,
  "brokerage-trades": brokerageTradesSchema,
  "schedule-k1": scheduleK1Schema,
} as const;

// ── Server function input schemas ────────────────────────────────

export const upsertDocumentSchema = z.object({
  id: z.string().uuid().optional(),
  estimateId: z.string().uuid(),
  documentType: documentTypeSchema,
  label: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
});

export const deleteByIdSchema = z.object({
  id: z.string().uuid(),
});

export const getEstimateSchema = z.object({
  estimateId: z.string().uuid(),
});
