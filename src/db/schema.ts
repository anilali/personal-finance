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
