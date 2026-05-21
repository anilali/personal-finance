import { z } from "zod/v3";

// ── Helpers ──────────────────────────────────────────────────────

const money = z.number().min(0);
const positiveNumber = z.number().positive();
const optionalMoney = z.preprocess(
  (val) => (val === "" || Number.isNaN(val) ? undefined : val),
  money.optional(),
);

// ── Company ─────────────────────────────────────────────────────

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  ticker: z.string().optional(),
  currentPrice: optionalMoney,
  priceAsOf: z.string().optional(),
  isCurrent: z.boolean(),
  separationDate: z.string().optional(),
});

// ── Grant ───────────────────────────────────────────────────────

export const grantSchema = z.object({
  companyId: z.string().uuid(),
  grantId: z.string().optional(),
  grantType: z.enum(["iso", "nso", "rsu"]),
  grantDate: z.string().min(1, "Grant date is required"),
  totalShares: positiveNumber,
  strikePrice: optionalMoney,
  grantPrice: optionalMoney,
  expirationDate: z.string().optional(),
  notes: z.string().optional(),
});

// ── Vest Event (manual entry) ───────────────────────────────────

export const vestEventSchema = z.object({
  vestDate: z.string().min(1, "Date is required"),
  shares: positiveNumber,
});

// ── Schedule Generator ──────────────────────────────────────────

export const scheduleGeneratorSchema = z.object({
  vestingStart: z.string().min(1, "Vesting start date is required"),
  totalMonths: z.number().int().min(1, "Must be at least 1 month"),
  cliffMonths: z.number().int().min(0),
  frequency: z.enum(["monthly", "quarterly", "annually"]),
  remainderStrategy: z.enum(["last", "first"]),
});

// ── Exercise ────────────────────────────────────────────────────

export const exerciseSchema = z.object({
  grantId: z.string().uuid(),
  referenceId: z.string().optional(),
  exerciseDate: z.string().min(1, "Exercise date is required"),
  shares: positiveNumber,
  exercisePrice: money,
  fmvAtExercise: money,
  unvestedShares: z.preprocess(
    (val) => (val === "" || Number.isNaN(val) ? 0 : val),
    z.number().min(0).default(0),
  ),
  filed83b: z.boolean().default(false),
  filed83bDate: z.string().optional(),
  notes: z.string().optional(),
});

// ── Sale ────────────────────────────────────────────────────────

export const saleSchema = z.object({
  grantId: z.string().uuid(),
  exerciseId: z.string().optional(),
  vestEventId: z.string().optional(),
  referenceId: z.string().optional(),
  saleDate: z.string().min(1, "Sale date is required"),
  shares: positiveNumber,
  salePrice: money,
  costBasisPerShare: money,
  isLongTerm: z.boolean(),
  notes: z.string().optional(),
});

export type SaleFormData = z.infer<typeof saleSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
export type GrantFormData = z.infer<typeof grantSchema>;
export type VestEventFormData = z.infer<typeof vestEventSchema>;
export type ScheduleGeneratorFormData = z.infer<typeof scheduleGeneratorSchema>;
export type ExerciseFormData = z.infer<typeof exerciseSchema>;
