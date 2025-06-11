CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"track_id" varchar NOT NULL,
	"time" real NOT NULL,
	"username" varchar NOT NULL,
	"text" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"author_user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" varchar PRIMARY KEY NOT NULL,
	"team_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accepted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" varchar PRIMARY KEY NOT NULL,
	"track_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar PRIMARY KEY NOT NULL,
	"team_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" varchar PRIMARY KEY NOT NULL,
	"team_id" varchar NOT NULL,
	"uploader_user_id" varchar NOT NULL,
	"filename" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"bpm" integer,
	"upload_date" timestamp DEFAULT now() NOT NULL,
	"duration" real NOT NULL,
	"file_deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
