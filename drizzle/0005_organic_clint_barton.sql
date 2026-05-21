CREATE TABLE "equity_donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grant_id" uuid NOT NULL,
	"exercise_id" uuid,
	"release_id" uuid,
	"donation_date" date NOT NULL,
	"shares" numeric(12, 4) NOT NULL,
	"fmv_at_donation" numeric(12, 4) NOT NULL,
	"recipient" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equity_donations" ADD CONSTRAINT "equity_donations_grant_id_equity_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."equity_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_donations" ADD CONSTRAINT "equity_donations_exercise_id_equity_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."equity_exercises"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equity_donations" ADD CONSTRAINT "equity_donations_release_id_equity_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."equity_releases"("id") ON DELETE set null ON UPDATE no action;