import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  pgEnum,
  numeric,
  date,
} from "drizzle-orm/pg-core";

// ── Existing tables ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Tax Estimator ────────────────────────────────────────────────

export const filingStatusEnum = pgEnum("filing_status", [
  "single",
  "mfj",
  "mfs",
  "hoh",
  "qss",
]);

export const estimateTypeEnum = pgEnum("estimate_type", [
  "year-end",
  "quarterly",
]);

export const documentTypeEnum = pgEnum("document_type", [
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

export const estimates = pgTable("estimates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  taxYear: integer("tax_year").notNull(),
  estimateType: estimateTypeEnum("estimate_type").default("year-end").notNull(),
  filingStatus: filingStatusEnum("filing_status").notNull(),
  state: text("state").notNull(),
  currentQuarter: integer("current_quarter").default(1).notNull(),
  priorYearTax: numeric("prior_year_tax", { precision: 12, scale: 2 }).default("0"),
  capitalLossCarryforward: numeric("capital_loss_carryforward", { precision: 12, scale: 2 }).default("0"),
  priorYearStateTax: numeric("prior_year_state_tax", { precision: 12, scale: 2 }).default("0"),
  paymentEntries: jsonb("payment_entries"),
  quarterlyPaymentsMade: jsonb("quarterly_payments_made"),
  selectedDocumentTypes: jsonb("selected_document_types"),
  useItemizedDeductions: boolean("use_itemized_deductions").default(false).notNull(),
  itemizedDeductions: jsonb("itemized_deductions"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const estimateDocuments = pgTable("estimate_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  estimateId: uuid("estimate_id")
    .notNull()
    .references(() => estimates.id, { onDelete: "cascade" }),
  documentType: documentTypeEnum("document_type").notNull(),
  label: text("label"),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Equity Tracker ──────────────────────────────────────────────

export const grantTypeEnum = pgEnum("grant_type", ["iso", "nso"]);

export const grantStatusEnum = pgEnum("grant_status", [
  "active",
  "fully_vested",
  "expired",
  "cancelled",
]);

export const vestStatusEnum = pgEnum("vest_status", ["scheduled", "vested", "forfeited"]);

export const equityCompanies = pgTable("equity_companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  ticker: text("ticker"),
  currentPrice: numeric("current_price", { precision: 12, scale: 4 }),
  priceAsOf: date("price_as_of"),
  isCurrent: boolean("is_current").default(true).notNull(),
  separationDate: date("separation_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const equityGrants = pgTable("equity_grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  grantId: text("grant_id"),
  companyId: uuid("company_id")
    .notNull()
    .references(() => equityCompanies.id, { onDelete: "cascade" }),
  grantType: grantTypeEnum("grant_type").notNull(),
  grantDate: date("grant_date").notNull(),
  totalShares: numeric("total_shares", { precision: 12, scale: 4 }).notNull(),
  strikePrice: numeric("strike_price", { precision: 12, scale: 4 }).notNull(),
  grantPrice: numeric("grant_price", { precision: 12, scale: 4 }),
  expirationDate: date("expiration_date"),
  vestingStart: date("vesting_start"),
  vestingSchedule: jsonb("vesting_schedule"),
  status: grantStatusEnum("status").default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const equityExercises = pgTable("equity_exercises", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceId: text("reference_id"),
  grantId: uuid("grant_id")
    .notNull()
    .references(() => equityGrants.id, { onDelete: "cascade" }),
  exerciseDate: date("exercise_date").notNull(),
  shares: numeric("shares", { precision: 12, scale: 4 }).notNull(),
  exercisePrice: numeric("exercise_price", { precision: 12, scale: 4 }).notNull(),
  fmvAtExercise: numeric("fmv_at_exercise", { precision: 12, scale: 4 }).notNull(),
  unvestedShares: numeric("unvested_shares", { precision: 12, scale: 4 }).default("0").notNull(),
  filed83b: boolean("filed_83b").default(false).notNull(),
  filed83bDate: date("filed_83b_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const equitySales = pgTable("equity_sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  referenceId: text("reference_id"),
  grantId: uuid("grant_id")
    .notNull()
    .references(() => equityGrants.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .references(() => equityExercises.id, { onDelete: "set null" }),
  saleDate: date("sale_date").notNull(),
  shares: numeric("shares", { precision: 12, scale: 4 }).notNull(),
  salePrice: numeric("sale_price", { precision: 12, scale: 4 }).notNull(),
  costBasisPerShare: numeric("cost_basis_per_share", { precision: 12, scale: 4 }).notNull(),
  isLongTerm: boolean("is_long_term").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const equityVestEvents = pgTable("equity_vest_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  grantId: uuid("grant_id")
    .notNull()
    .references(() => equityGrants.id, { onDelete: "cascade" }),
  vestDate: date("vest_date").notNull(),
  shares: numeric("shares", { precision: 12, scale: 4 }).notNull(),
  status: vestStatusEnum("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
