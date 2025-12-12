import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// Map event type to display type
function inferEventType(tags: string[] | null): string {
  if (!tags || tags.length === 0) return "discovery";
  const lowercaseTags = tags.map(t => t.toLowerCase());
  if (lowercaseTags.some(t => t.includes("war") || t.includes("battle") || t.includes("conflict"))) return "conflict";
  if (lowercaseTags.some(t => t.includes("discover") || t.includes("explor"))) return "discovery";
  if (lowercaseTags.some(t => t.includes("cultur") || t.includes("art") || t.includes("religion"))) return "cultural";
  if (lowercaseTags.some(t => t.includes("politic") || t.includes("govern") || t.includes("law"))) return "political";
  if (lowercaseTags.some(t => t.includes("tech") || t.includes("science") || t.includes("invent"))) return "technological";
  return "discovery";
}

// GET - Fetch a single event by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await db.execute(sql`
      SELECT
        id,
        title,
        description,
        date_year as year,
        date_month as month,
        date_day as day,
        date_precision,
        date_display,
        location_name,
        location_country,
        ST_Y(location_coordinates::geometry) as lat,
        ST_X(location_coordinates::geometry) as lng,
        tags,
        sources,
        created_at,
        created_by
      FROM events
      WHERE id = ${id}::uuid
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const event = result.rows[0] as any;

    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      year: event.year,
      month: event.month,
      day: event.day,
      datePrecision: event.date_precision,
      dateDisplay: event.date_display,
      lat: event.lat ? parseFloat(event.lat) : 0,
      lng: event.lng ? parseFloat(event.lng) : 0,
      locationName: event.location_name || event.location_country,
      country: event.location_country,
      type: inferEventType(event.tags),
      tags: event.tags,
      sources: event.sources,
      createdAt: event.created_at,
      createdBy: event.created_by,
    };

    return NextResponse.json(formattedEvent);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
