CREATE TABLE "equity_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"reference_id" text,
	"release_date" date NOT NULL,
	"shares_released" numeric(12, 4) NOT NULL,
	"shares_received" numeric(12, 4) NOT NULL,
	"fmv_at_release" numeric(12, 4),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equity_sales" DROP CONSTRAINT "equity_sales_vest_event_id_equity_vest_events_id_fk";
--> statement-breakpoint
ALTER TABLE "equity_sales" ADD COLUMN "release_id" uuid;--> statement-breakpoint
ALTER TABLE "equity_releases" ADD CONSTRAINT "equity_releases_grant_id_equity_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."equity_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_sales" ADD CONSTRAINT "equity_sales_release_id_equity_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."equity_releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_sales" DROP COLUMN "vest_event_id";--> statement-breakpoint
ALTER TABLE "equity_vest_events" DROP COLUMN "shares_received";--> statement-breakpoint
ALTER TABLE "equity_vest_events" DROP COLUMN "fmv_at_vest";