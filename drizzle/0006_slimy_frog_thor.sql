ALTER TABLE "message" DROP CONSTRAINT "message_parent_id_message_id_fk";
--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "parent_id";