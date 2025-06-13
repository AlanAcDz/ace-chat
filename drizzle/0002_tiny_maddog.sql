CREATE TABLE "user_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"invited_by" text NOT NULL,
	"username" text NOT NULL,
	"grants" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "user_invite_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "user_invite" ADD CONSTRAINT "user_invite_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;