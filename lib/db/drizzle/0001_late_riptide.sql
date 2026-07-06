ALTER TABLE "players" ALTER COLUMN "gold" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "facebook_id" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "is_guest" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_facebook_id_unique" UNIQUE("facebook_id");