CREATE TYPE "public"."contribution_type" AS ENUM('event', 'source', 'cultural_context', 'discussion');--> statement-breakpoint
CREATE TYPE "public"."date_precision" AS ENUM('day', 'month', 'year', 'decade', 'century');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('conflict', 'discovery', 'cultural', 'political', 'technological');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('primary', 'secondary', 'tertiary', 'web');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."thread_status" AS ENUM('open', 'resolved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('viewer', 'contributor', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'contested', 'probable', 'verified');--> statement-breakpoint
CREATE TABLE "cultural_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"source_culture" text,
	"affected_cultures" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"significance" text,
	"legacy" text,
	"related_artifacts" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discourse_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"evidence" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discourse_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "thread_status" DEFAULT 'open' NOT NULL,
	"resolution_summary" text,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_data" jsonb NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cultural_contexts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"ai_verification_score" integer,
	"ai_verification_report" jsonb,
	"community_votes" jsonb DEFAULT '{"upvotes":0,"downvotes":0}'::jsonb NOT NULL,
	"submitted_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"review_notes" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"long_description" text,
	"year" integer NOT NULL,
	"month" integer,
	"day" integer,
	"date_precision" date_precision DEFAULT 'year' NOT NULL,
	"end_year" integer,
	"end_month" integer,
	"end_day" integer,
	"lat" numeric(10, 8) NOT NULL,
	"lng" numeric(11, 8) NOT NULL,
	"location_name" text,
	"city" text,
	"country" text,
	"region" text,
	"event_type" "event_type" NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"importance" integer DEFAULT 5 NOT NULL,
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"entity_id" uuid,
	"entity_table" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" text NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"source_type" "source_type" NOT NULL,
	"author" text,
	"publication_date" text,
	"publisher" text,
	"description" text,
	"credibility_score" integer DEFAULT 50 NOT NULL,
	"language" text DEFAULT 'en',
	"archived" boolean DEFAULT false NOT NULL,
	"archive_url" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contribution_type" "contribution_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_table" text NOT NULL,
	"action" text NOT NULL,
	"reputation_change" integer DEFAULT 0 NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_id" text,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"reputation_score" integer DEFAULT 0 NOT NULL,
	"bio" text,
	"location" text,
	"website" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_table" text NOT NULL,
	"vote_type" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cultural_contexts" ADD CONSTRAINT "cultural_contexts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cultural_contexts" ADD CONSTRAINT "cultural_contexts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discourse_comments" ADD CONSTRAINT "discourse_comments_thread_id_discourse_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discourse_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discourse_comments" ADD CONSTRAINT "discourse_comments_parent_id_discourse_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discourse_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discourse_comments" ADD CONSTRAINT "discourse_comments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discourse_comments" ADD CONSTRAINT "discourse_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discourse_threads" ADD CONSTRAINT "discourse_threads_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discourse_threads" ADD CONSTRAINT "discourse_threads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discourse_threads" ADD CONSTRAINT "discourse_threads_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_submissions" ADD CONSTRAINT "event_submissions_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_submissions" ADD CONSTRAINT "event_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contributions" ADD CONSTRAINT "user_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cultural_contexts_event_id_idx" ON "cultural_contexts" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "cultural_contexts_type_idx" ON "cultural_contexts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "discourse_comments_thread_id_idx" ON "discourse_comments" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "discourse_comments_parent_id_idx" ON "discourse_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "discourse_comments_created_by_idx" ON "discourse_comments" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "discourse_threads_event_id_idx" ON "discourse_threads" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "discourse_threads_status_idx" ON "discourse_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discourse_threads_created_by_idx" ON "discourse_threads" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "event_submissions_status_idx" ON "event_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_submissions_submitted_by_idx" ON "event_submissions" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "events_year_idx" ON "events" USING btree ("year");--> statement-breakpoint
CREATE INDEX "events_lat_lng_idx" ON "events" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "events_event_type_idx" ON "events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "events_verification_status_idx" ON "events" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "sessions_token_idx" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sources_event_id_idx" ON "sources" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "sources_source_type_idx" ON "sources" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "user_contributions_user_id_idx" ON "user_contributions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_contributions_entity_id_idx" ON "user_contributions" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "user_contributions_type_idx" ON "user_contributions" USING btree ("contribution_type");--> statement-breakpoint
CREATE INDEX "users_github_id_idx" ON "users" USING btree ("github_id");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "votes_user_entity_idx" ON "votes" USING btree ("user_id","entity_id","entity_table");--> statement-breakpoint
CREATE INDEX "votes_entity_idx" ON "votes" USING btree ("entity_id","entity_table");