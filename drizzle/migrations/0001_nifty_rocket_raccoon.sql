ALTER TABLE "game_rooms" ADD COLUMN "elimination_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_rooms" ADD COLUMN "active_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "guesses" ADD COLUMN "is_duplicate_penalty" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "triggered_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;