import { Agent } from "@mastra/core/agent";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { tool } from "ai";
import { z } from "zod";
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

// Geocoding tool
const geocodeTool = tool({
  description: "Geocode a location name to get latitude and longitude coordinates. Returns multiple results ranked by relevance.",
  parameters: z.object({
    locationName: z.string().describe("The location name to geocode (e.g., 'Rome, Italy', 'Battle of Hastings location')"),
  }),
  execute: async ({ locationName }) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: locationName,
            format: "json",
            limit: "3",
          }),
        {
          headers: {
            "User-Agent": "WorldTrue-HistoricalMap/1.0",
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: "Geocoding request failed",
          results: [],
        };
      }

      const results = await response.json();

      return {
        success: results.length > 0,
        results: results.map((result: any) => ({
          lat: result.lat,
          lng: result.lon,
          displayName: result.display_name,
          type: result.type,
          importance: result.importance,
        })),
        message: results.length > 0
          ? `Found ${results.length} result(s) for "${locationName}". Top result: ${results[0].display_name}`
          : `No results found for "${locationName}". Try a more specific location name.`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  },
});

// Create event tool
const createEventTool = tool({
  description: "Create a new historical event on the map. Use this after geocoding the location. This will add a visible marker on the map.",
  parameters: z.object({
    title: z.string().describe("Event title (3-8 words, e.g., 'Fall of the Roman Empire')"),
    description: z.string().describe("Detailed description (2-3 sentences with historical context)"),
    year: z.number().int().describe("Year the event occurred (e.g., 476, 1066, 1492)"),
    month: z.number().int().min(1).max(12).optional().describe("Month (1-12) if known"),
    day: z.number().int().min(1).max(31).optional().describe("Day (1-31) if known"),
    lat: z.string().describe("Latitude from geocoding result"),
    lng: z.string().describe("Longitude from geocoding result"),
    locationName: z.string().describe("Location name (e.g., 'Rome, Italy')"),
    eventType: z.enum(["conflict", "discovery", "cultural", "political", "technological"]).describe("Type of event"),
    importance: z.number().int().min(1).max(10).optional().default(5).describe("Importance (1-10, default 5)"),
  }),
  execute: async (params) => {
    try {
      const systemUserId = await getSystemUserId();

      const [newEvent] = await db
        .insert(events)
        .values({
          title: params.title,
          description: params.description,
          year: params.year,
          month: params.month || null,
          day: params.day || null,
          datePrecision: params.day ? "day" : params.month ? "month" : "year",
          lat: params.lat,
          lng: params.lng,
          locationName: params.locationName,
          eventType: params.eventType,
          importance: params.importance,
          verificationStatus: "unverified",
          createdBy: systemUserId,
          metadata: {
            source: "Mastra AI Agent",
            generatedAt: new Date().toISOString(),
          },
        })
        .returning();

      return {
        success: true,
        eventId: newEvent.id,
        message: `Successfully created event "${params.title}" at ${params.locationName} (${params.year})`,
        event: {
          id: newEvent.id,
          title: newEvent.title,
          year: newEvent.year,
          location: params.locationName,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to create event",
        message: `Failed to create event "${params.title}": ${error.message}`,
      };
    }
  },
});

export function createMapResearcherAgent(apiKey: string) {
  const google = createGoogleGenerativeAI({
    apiKey: apiKey,
  });

  return new Agent({
    name: "Map Researcher",
    description: "Historical research agent that finds events and plots them on the map",
    instructions: `You are WorldTrue Map Researcher, an AI agent specialized in historical research and mapping.

Your mission: Help users discover and map historical events on an interactive world map.

## Workflow

When a user asks you to find and map historical events:

1. **Understand the Query**
   - Identify the historical topic, time period, and geographic scope
   - Determine how many events to find (usually 3-5 for quality)

2. **Research Historical Events**
   - Use your knowledge of history to identify significant events
   - For each event, gather:
     * Exact title (3-8 words)
     * Detailed description (2-3 sentences with context)
     * Precise date (year required, month/day if known)
     * Specific location (city, country)
     * Event type (conflict/discovery/cultural/political/technological)
   - Prioritize well-documented, verifiable events

3. **Geocode Locations**
   - For each event, use the geocodeTool to get coordinates
   - Provide specific location names: "Rome, Italy" not just "Rome"
   - If geocoding fails, try alternative names or nearby cities
   - Verify the geocoded location matches your historical knowledge

4. **Create Events on Map**
   - Use createEventTool for each successfully geocoded event
   - Pass the exact lat/lng from geocoding results
   - Use appropriate event type and importance (1-10)

5. **Report Results**
   - Summarize what you created
   - Mention any events you couldn't map and why
   - Provide historical context

## Important Guidelines

- **Quality over quantity**: 3-5 well-researched events > 20 vague ones
- **Accuracy matters**: Verify dates and locations
- **Be specific**: "Battle of Hastings, Hastings, England" not "somewhere in England"
- **Historical context**: Explain WHY events are significant
- **Handle failures gracefully**: If geocoding fails, explain and suggest alternatives
- **Event types**:
  - conflict: Wars, battles, sieges
  - discovery: Scientific/geographic discoveries
  - cultural: Art, literature, cultural movements
  - political: Treaties, governments, political changes
  - technological: Inventions, innovations

## Example Workflow

User: "Find events about the fall of Rome"

1. Research: Identify 3-5 key events (sack of Rome 410, fall of Western Empire 476, etc.)
2. For each event:
   - Geocode "Rome, Italy" → get lat/lng
   - Create event with title "Sack of Rome by Visigoths", year 410, etc.
3. Report: "I've mapped 5 key events related to the fall of Rome, spanning 410-476 CE..."

Remember: You're creating a historical map. Accuracy and clarity are paramount!`,

    model: google("gemini-2.5-flash"),

    tools: {
      geocode: geocodeTool,
      createEvent: createEventTool,
    },
  });
}
