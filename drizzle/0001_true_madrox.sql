CREATE TYPE "public"."api_key_scope" AS ENUM('personal', 'shared');--> statement-breakpoint
ALTER TABLE "api_key" ADD COLUMN "scope" "api_key_scope" DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "default_system_prompt" text;