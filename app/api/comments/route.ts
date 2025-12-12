import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

// Validation schema for creating comments
const createCommentSchema = z.object({
  eventId: z.string().uuid(),
  authorName: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
});

// Ensure comments table exists (run once on first request)
let tableCreated = false;

async function ensureTable() {
  if (tableCreated) return;

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS event_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL,
        parent_id UUID REFERENCES event_comments(id) ON DELETE CASCADE,
        author_name VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        upvotes INTEGER NOT NULL DEFAULT 0,
        downvotes INTEGER NOT NULL DEFAULT 0,
        is_edited BOOLEAN NOT NULL DEFAULT false,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS event_comments_event_id_idx ON event_comments(event_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS event_comments_parent_id_idx ON event_comments(parent_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS event_comments_created_at_idx ON event_comments(created_at DESC);
    `);

    tableCreated = true;
  } catch (error) {
    console.error("Error creating comments table:", error);
  }
}

// GET - Fetch comments for an event
export async function GET(request: NextRequest) {
  try {
    await ensureTable();

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const result = await db.execute(sql`
      SELECT
        id,
        event_id,
        parent_id,
        author_name,
        content,
        upvotes,
        downvotes,
        is_edited,
        is_deleted,
        created_at,
        updated_at
      FROM event_comments
      WHERE event_id = ${eventId}
        AND is_deleted = false
      ORDER BY created_at ASC
    `);

    // Build nested structure for replies
    const comments = result.rows as any[];
    const commentMap = new Map();
    const rootComments: any[] = [];

    // First pass: create map of all comments
    comments.forEach((comment) => {
      commentMap.set(comment.id, {
        id: comment.id,
        eventId: comment.event_id,
        parentId: comment.parent_id,
        authorName: comment.author_name,
        content: comment.content,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        isEdited: comment.is_edited,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        replies: [],
      });
    });

    // Second pass: build tree structure
    comments.forEach((comment) => {
      const node = commentMap.get(comment.id);
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        commentMap.get(comment.parent_id).replies.push(node);
      } else {
        rootComments.push(node);
      }
    });

    return NextResponse.json({
      comments: rootComments,
      total: comments.length,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST - Create a new comment
export async function POST(request: NextRequest) {
  try {
    await ensureTable();

    const body = await request.json();

    // Validate request body
    const validationResult = createCommentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const result = await db.execute(sql`
      INSERT INTO event_comments (
        event_id, parent_id, author_name, content
      ) VALUES (
        ${data.eventId},
        ${data.parentId || null},
        ${data.authorName},
        ${data.content}
      )
      RETURNING
        id, event_id, parent_id, author_name, content,
        upvotes, downvotes, is_edited, created_at, updated_at
    `);

    const newComment = (result.rows as any[])[0];

    return NextResponse.json(
      {
        id: newComment.id,
        eventId: newComment.event_id,
        parentId: newComment.parent_id,
        authorName: newComment.author_name,
        content: newComment.content,
        upvotes: newComment.upvotes,
        downvotes: newComment.downvotes,
        isEdited: newComment.is_edited,
        createdAt: newComment.created_at,
        updatedAt: newComment.updated_at,
        replies: [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a comment
export async function DELETE(request: NextRequest) {
  try {
    await ensureTable();

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("id");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment id is required" },
        { status: 400 }
      );
    }

    await db.execute(sql`
      UPDATE event_comments
      SET is_deleted = true, updated_at = NOW()
      WHERE id = ${commentId}
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}

// PATCH - Update a comment or vote
export async function PATCH(request: NextRequest) {
  try {
    await ensureTable();

    const body = await request.json();
    const { id, content, vote } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Comment id is required" },
        { status: 400 }
      );
    }

    // Handle voting
    if (vote === "up" || vote === "down") {
      const column = vote === "up" ? "upvotes" : "downvotes";
      await db.execute(sql.raw(`
        UPDATE event_comments
        SET ${column} = ${column} + 1
        WHERE id = '${id}'
      `));

      return NextResponse.json({ success: true });
    }

    // Handle content update
    if (content) {
      await db.execute(sql`
        UPDATE event_comments
        SET content = ${content}, is_edited = true, updated_at = NOW()
        WHERE id = ${id}
      `);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "No update data provided" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}
