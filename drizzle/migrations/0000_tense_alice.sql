CREATE TYPE "public"."game_status" AS ENUM('waiting', 'active', 'finished');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('submitting', 'calculating', 'completed');--> statement-breakpoint
CREATE TABLE "game_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_code" varchar(8) NOT NULL,
	"host_user_id" uuid NOT NULL,
	"status" "game_status" DEFAULT 'waiting' NOT NULL,
	"max_players" integer DEFAULT 8 NOT NULL,
	"elimination_score" integer DEFAULT -10 NOT NULL,
	"round_duration" integer DEFAULT 60 NOT NULL,
	"current_round" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_rooms_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "guesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"round_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"value" real NOT NULL,
	"deviation" real,
	"score_delta" integer,
	"is_round_winner" boolean DEFAULT false NOT NULL,
	"is_exact_match" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"is_eliminated" boolean DEFAULT false NOT NULL,
	"is_winner" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"status" "round_status" DEFAULT 'submitting' NOT NULL,
	"target_number" real,
	"average_guess" real,
	"submission_deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(32) NOT NULL,
	"avatar_url" varchar(512),
	"is_ai" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "game_rooms" ADD CONSTRAINT "game_rooms_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_room_id_game_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."game_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guesses_round_player_idx" ON "guesses" USING btree ("round_id","player_id");--> statement-breakpoint
CREATE INDEX "guesses_round_idx" ON "guesses" USING btree ("round_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_user_room_idx" ON "players" USING btree ("user_id","room_id");--> statement-breakpoint
CREATE INDEX "players_room_idx" ON "players" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_room_number_idx" ON "rounds" USING btree ("room_id","round_number");