CREATE TYPE "public"."document_type" AS ENUM('w2', 'paystub', '1099-div', '1099-int', '1099-misc', '1099-b', '1099-oid', '1099-nec', '1099-r', '1098', '5498', '8949', 'brokerage-trades', 'schedule-k1');--> statement-breakpoint
CREATE TYPE "public"."estimate_type" AS ENUM('year-end', 'quarterly');--> statement-breakpoint
CREATE TYPE "public"."filing_status" AS ENUM('single', 'mfj', 'mfs', 'hoh', 'qss');--> statement-breakpoint
CREATE TYPE "public"."grant_status" AS ENUM('active', 'fully_vested', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."grant_type" AS ENUM('iso', 'nso', 'rsu');--> statement-breakpoint
CREATE TYPE "public"."vest_status" AS ENUM('scheduled', 'vested', 'forfeited');--> statement-breakpoint
CREATE TABLE "equity_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"ticker" text,
	"current_price" numeric(12, 4),
	"price_as_of" date,
	"is_current" boolean DEFAULT true NOT NULL,
	"separation_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equity_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" text,
	"grant_id" uuid NOT NULL,
	"exercise_date" date NOT NULL,
	"shares" numeric(12, 4) NOT NULL,
	"exercise_price" numeric(12, 4) NOT NULL,
	"fmv_at_exercise" numeric(12, 4) NOT NULL,
	"unvested_shares" numeric(12, 4) DEFAULT '0' NOT NULL,
	"filed_83b" boolean DEFAULT false NOT NULL,
	"filed_83b_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equity_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" text,
	"company_id" uuid NOT NULL,
	"grant_type" "grant_type" NOT NULL,
	"grant_date" date NOT NULL,
	"total_shares" numeric(12, 4) NOT NULL,
	"strike_price" numeric(12, 4) NOT NULL,
	"grant_price" numeric(12, 4),
	"expiration_date" date,
	"vesting_start" date,
	"vesting_schedule" jsonb,
	"status" "grant_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equity_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_id" text,
	"grant_id" uuid NOT NULL,
	"exercise_id" uuid,
	"vest_event_id" uuid,
	"sale_date" date NOT NULL,
	"shares" numeric(12, 4) NOT NULL,
	"sale_price" numeric(12, 4) NOT NULL,
	"cost_basis_per_share" numeric(12, 4) NOT NULL,
	"is_long_term" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equity_vest_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"vest_date" date NOT NULL,
	"shares" numeric(12, 4) NOT NULL,
	"fmv_at_vest" numeric(12, 4),
	"status" "vest_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimate_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estimate_id" uuid NOT NULL,
	"document_type" "document_type" NOT NULL,
	"label" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tax_year" integer NOT NULL,
	"estimate_type" "estimate_type" DEFAULT 'year-end' NOT NULL,
	"filing_status" "filing_status" NOT NULL,
	"state" text NOT NULL,
	"current_quarter" integer DEFAULT 1 NOT NULL,
	"prior_year_tax" numeric(12, 2) DEFAULT '0',
	"capital_loss_carryforward" numeric(12, 2) DEFAULT '0',
	"prior_year_state_tax" numeric(12, 2) DEFAULT '0',
	"payment_entries" jsonb,
	"quarterly_payments_made" jsonb,
	"selected_document_types" jsonb,
	"use_itemized_deductions" boolean DEFAULT false NOT NULL,
	"itemized_deductions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "equity_exercises" ADD CONSTRAINT "equity_exercises_grant_id_equity_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."equity_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_grants" ADD CONSTRAINT "equity_grants_company_id_equity_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."equity_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_sales" ADD CONSTRAINT "equity_sales_grant_id_equity_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."equity_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_sales" ADD CONSTRAINT "equity_sales_exercise_id_equity_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."equity_exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_sales" ADD CONSTRAINT "equity_sales_vest_event_id_equity_vest_events_id_fk" FOREIGN KEY ("vest_event_id") REFERENCES "public"."equity_vest_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_vest_events" ADD CONSTRAINT "equity_vest_events_grant_id_equity_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."equity_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimate_documents" ADD CONSTRAINT "estimate_documents_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE cascade ON UPDATE no action;