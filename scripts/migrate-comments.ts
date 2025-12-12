// Migration script to create event_comments table
// Run with: npx tsx scripts/migrate-comments.ts

import { db } from "../db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Creating event_comments table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS event_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL,
      parent_id UUID REFERENCES event_comments(id) ON DELETE CASCADE,
      author_name VARCHAR(100) NOT NULL,
      author_email VARCHAR(255),
      content TEXT NOT NULL,
      upvotes INTEGER NOT NULL DEFAULT 0,
      downvotes INTEGER NOT NULL DEFAULT 0,
      is_edited BOOLEAN NOT NULL DEFAULT false,
      is_deleted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Create indexes for performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS event_comments_event_id_idx ON event_comments(event_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS event_comments_parent_id_idx ON event_comments(parent_id);
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS event_comments_created_at_idx ON event_comments(created_at DESC);
  `);

  console.log("Migration completed successfully!");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
