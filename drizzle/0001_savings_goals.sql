CREATE TYPE "public"."goal_status" AS ENUM('active', 'completed', 'missed', 'paused');--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"users_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(12, 2) NOT NULL,
	"current_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"currencies_id" uuid NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"due_date" date,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "goals_target_amount_check" CHECK ("goals"."target_amount" > 0 AND "goals"."target_amount" < 10000000000),
	CONSTRAINT "goals_current_amount_check" CHECK ("goals"."current_amount" >= 0 AND "goals"."current_amount" < 10000000000)
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_users_id_users_id_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_currencies_id_currencies_id_fk" FOREIGN KEY ("currencies_id") REFERENCES "public"."currencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_users_id_idx" ON "goals" USING btree ("users_id");