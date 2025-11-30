import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

// Validation schema for creating events (matching existing DB schema)
const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  year: z.number().int().min(-10000).max(new Date().getFullYear()),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
  datePrecision: z.enum(["day", "month", "year", "decade", "century"]).default("year"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationName: z.string().max(500).optional(),
  eventType: z.enum(["conflict", "discovery", "cultural", "political", "technological"]),
  metadata: z.record(z.any()).optional(),
});

// Map event type to display type (existing DB uses tags array)
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

// GET - Fetch all events from existing database
export async function GET() {
  try {
    // Query existing events table with actual column names
    const result = await db.execute(sql`
      SELECT
        id,
        title,
        description,
        date_year as year,
        date_month as month,
        date_day as day,
        date_precision,
        location_name,
        location_country,
        ST_Y(location_coordinates::geometry) as lat,
        ST_X(location_coordinates::geometry) as lng,
        tags,
        sources,
        created_at
      FROM events
      ORDER BY date_year DESC
      LIMIT 500
    `);

    // Format events for frontend
    const formattedEvents = (result.rows as any[]).map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      year: event.year,
      month: event.month,
      day: event.day,
      datePrecision: event.date_precision,
      lat: event.lat ? parseFloat(event.lat) : 0,
      lng: event.lng ? parseFloat(event.lng) : 0,
      locationName: event.location_name || event.location_country,
      type: inferEventType(event.tags),
      tags: event.tags,
      sources: event.sources,
      createdAt: event.created_at,
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST - Create a new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = createEventSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Format date display string
    let dateDisplay = data.year.toString();
    if (data.month) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      dateDisplay = `${months[data.month - 1]} ${data.year}`;
      if (data.day) {
        dateDisplay = `${months[data.month - 1]} ${data.day}, ${data.year}`;
      }
    }

    // Map eventType to tag
    const tag = data.eventType.charAt(0).toUpperCase() + data.eventType.slice(1);

    // Insert using raw SQL to match existing schema
    const result = await db.execute(sql`
      INSERT INTO events (
        id, title, description, date_year, date_month, date_day,
        date_display, date_precision, location_name, location_coordinates,
        tags, created_at, created_by
      ) VALUES (
        gen_random_uuid(),
        ${data.title},
        ${data.description},
        ${data.year},
        ${data.month || null},
        ${data.day || null},
        ${dateDisplay},
        ${data.datePrecision},
        ${data.locationName || 'Unknown'},
        ST_SetSRID(ST_MakePoint(${data.lng}, ${data.lat}), 4326)::geography,
        ARRAY[${tag}]::varchar[],
        NOW(),
        'user'
      )
      RETURNING id, title, description, date_year as year,
        ST_Y(location_coordinates::geometry) as lat,
        ST_X(location_coordinates::geometry) as lng,
        location_name, tags
    `);

    const newEvent = (result.rows as any[])[0];

    return NextResponse.json(
      {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        year: newEvent.year,
        lat: parseFloat(newEvent.lat),
        lng: parseFloat(newEvent.lng),
        locationName: newEvent.location_name,
        type: data.eventType,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event", details: String(error) },
      { status: 500 }
    );
  }
}
