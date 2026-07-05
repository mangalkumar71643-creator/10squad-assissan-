CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"rarity" text DEFAULT 'common',
	"unlocked" boolean DEFAULT true,
	"selected" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "lobby_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"status" text DEFAULT 'empty',
	"player_id" integer,
	"character" text
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"avatar" text DEFAULT '/assets/avatars/default.png',
	"level" integer DEFAULT 1,
	"gold" integer DEFAULT 0,
	"diamonds" integer DEFAULT 0,
	"tokens" integer DEFAULT 0,
	"rank" text DEFAULT 'Bronze',
	"title" text DEFAULT 'PROJECT',
	"character" text DEFAULT 'default'
);
--> statement-breakpoint
CREATE TABLE "weapons" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer,
	"name" text NOT NULL,
	"image" text NOT NULL,
	"type" text DEFAULT 'rifle',
	"rarity" text DEFAULT 'common',
	"unlocked" boolean DEFAULT true,
	"selected" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "matchmaking_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"started_at" timestamp,
	"total_players" integer DEFAULT 5 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lobby_slots" ADD CONSTRAINT "lobby_slots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weapons" ADD CONSTRAINT "weapons_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;