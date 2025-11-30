import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Get or create system user for AI-generated events
async function getSystemUserId(): Promise<string> {
  const systemEmail = "system@worldtrue.app";

  try {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, systemEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return existingUser[0].id;
    }

    // Create system user if it doesn't exist
    const [newUser] = await db
      .insert(users)
      .values({
        email: systemEmail,
        username: "system",
        name: "AI Research Agent",
        role: "admin",
      })
      .returning();

    return newUser.id;
  } catch (error) {
    console.error("Error getting system user:", error);
    throw new Error("Failed to get system user");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { events: eventsList } = await request.json();

    if (!eventsList || !Array.isArray(eventsList)) {
      return NextResponse.json(
        { error: "Events array is required" },
        { status: 400 }
      );
    }

    if (eventsList.length === 0) {
      return NextResponse.json(
        { error: "Events array cannot be empty" },
        { status: 400 }
      );
    }

    const systemUserId = await getSystemUserId();
    const results = [];
    const errors = [];

    for (const event of eventsList) {
      try {
        // Validate required fields
        if (!event.title || !event.description || !event.year || !event.lat || !event.lng || !event.eventType) {
          errors.push({
            title: event.title || "Unknown",
            error: "Missing required fields (title, description, year, lat, lng, eventType)",
          });
          continue;
        }

        // Create event
        const [newEvent] = await db
          .insert(events)
          .values({
            title: event.title,
            description: event.description,
            longDescription: event.longDescription || null,
            year: event.year,
            month: event.month || null,
            day: event.day || null,
            datePrecision: event.datePrecision || "year",
            lat: event.lat,
            lng: event.lng,
            locationName: event.locationName || null,
            city: event.city || null,
            country: event.country || null,
            region: event.region || null,
            eventType: event.eventType,
            categories: event.categories || [],
            tags: event.tags || [],
            importance: event.importance || 5,
            verificationStatus: "unverified",
            createdBy: systemUserId,
            metadata: {
              source: "AI Historical Research Agent",
              generatedAt: new Date().toISOString(),
              sources: event.sources || null,
              confidence: event.confidence || null,
              ...event.metadata,
            },
          })
          .returning();

        results.push({
          success: true,
          eventId: newEvent.id,
          title: newEvent.title,
        });
      } catch (error: any) {
        console.error(`Failed to create event ${event.title}:`, error);
        errors.push({
          title: event.title || "Unknown",
          error: error.message || "Failed to create event",
        });
      }
    }

    const successCount = results.length;
    const failureCount = errors.length;

    return NextResponse.json({
      success: true,
      total: eventsList.length,
      succeeded: successCount,
      failed: failureCount,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Batch events API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process batch events" },
      { status: 500 }
    );
  }
}
