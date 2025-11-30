import { tool } from "ai";
import { z } from "zod";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// System user ID for AI-generated events
let systemUserId: string | null = null;

async function getSystemUserId() {
  if (systemUserId) return systemUserId;

  try {
    // Try to find existing system user
    const existing = await db.select().from(users).where(eq(users.username, "ai-agent")).limit(1);

    if (existing && existing.length > 0) {
      systemUserId = existing[0].id;
      return systemUserId;
    }

    // Create system user if doesn't exist
    const newUsers = await db.insert(users).values({
      username: "ai-agent",
      email: "ai-agent@worldtrue.internal",
      name: "AI Research Agent",
      role: "contributor",
    }).returning();

    if (newUsers && newUsers.length > 0) {
      systemUserId = newUsers[0].id;
      return systemUserId;
    }
  } catch (error) {
    console.error("Error getting/creating system user:", error);
  }

  // Fallback: use a placeholder UUID if database fails
  return "00000000-0000-0000-0000-000000000000";
}

/**
 * Tool for geocoding location names to coordinates
 */
export const geocodeTool = tool({
  description: "Convert a location name into geographic coordinates",
  parameters: z.object({
    locationName: z.string().describe("Location name like 'Paris, France' or 'Rome, Italy'"),
    maxResults: z.number().optional().default(1),
  }),
  execute: async (params) => {
    const { locationName, maxResults } = params;

    try {
      const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
        q: locationName,
        format: 'json',
        limit: String(maxResults || 1),
        addressdetails: '1',
      });

      const response = await fetch(url, {
        headers: { 'User-Agent': 'WorldTrue Historical Events App' },
      });

      if (!response.ok) {
        return { success: false, message: "Geocoding failed", results: [] };
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return { success: false, message: `No results for "${locationName}"`, results: [] };
      }

      const results = data.map((item: any) => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type,
      }));

      return { success: true, message: `Found ${results.length} location(s)`, results };
    } catch (error: any) {
      return { success: false, message: error.message, results: [] };
    }
  },
});

/**
 * Tool for creating historical events
 */
export const createEventTool = tool({
  description: "Create a new historical event in the database",
  parameters: z.object({
    title: z.string(),
    description: z.string(),
    year: z.number().int(),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationName: z.string(),
    eventType: z.enum(["conflict", "discovery", "cultural", "political", "technological"]),
    sources: z.array(z.string()).optional(),
  }),
  execute: async (params) => {
    const { title, description, year, month, day, latitude, longitude, locationName, eventType, sources } = params;

    try {
      let datePrecision: "day" | "month" | "year" | "decade" | "century" = "year";
      if (day && month) {
        datePrecision = "day";
      } else if (month) {
        datePrecision = "month";
      }

      const userId = await getSystemUserId();

      const newEvents = await db.insert(events).values({
        title,
        description,
        year,
        month,
        day,
        lat: latitude.toString(),
        lng: longitude.toString(),
        locationName,
        eventType,
        datePrecision,
        verificationStatus: "unverified",
        createdBy: userId,
        metadata: {
          source: "AI Agent",
          generatedAt: new Date().toISOString(),
          sources: sources || [],
        },
      }).returning();

      if (newEvents && newEvents.length > 0) {
        const newEvent = newEvents[0];
        return {
          success: true,
          message: `Created event: "${title}"`,
          event: {
            id: newEvent.id,
            title: newEvent.title,
            year: newEvent.year,
            latitude,
            longitude,
            eventType: newEvent.eventType,
          },
        };
      }

      return { success: false, message: "Failed to create event", event: null };
    } catch (error: any) {
      return { success: false, message: error.message, event: null };
    }
  },
});

/**
 * Tool for searching history (placeholder)
 */
export const searchHistoryTool = tool({
  description: "Search for historical information",
  parameters: z.object({
    query: z.string(),
    maxResults: z.number().optional().default(5),
  }),
  execute: async (params) => {
    return {
      success: true,
      message: `Use your knowledge about "${params.query}"`,
      suggestion: "Use training data to provide accurate historical information.",
    };
  },
});

/**
 * Tool for listing events
 */
export const listEventsTool = tool({
  description: "List recent events from the database",
  parameters: z.object({
    limit: z.number().optional().default(20),
    eventType: z.enum(["conflict", "discovery", "cultural", "political", "technological"]).optional(),
  }),
  execute: async (params) => {
    const { limit, eventType } = params;

    try {
      let query = db.select({
        id: events.id,
        title: events.title,
        description: events.description,
        year: events.year,
        locationName: events.locationName,
        eventType: events.eventType,
      }).from(events);

      if (eventType) {
        query = query.where(eq(events.eventType, eventType)) as any;
      }

      const results = await query.limit(limit || 20);

      return {
        success: true,
        count: results.length,
        events: results,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        events: [],
      };
    }
  },
});
