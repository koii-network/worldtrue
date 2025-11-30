import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/db";
import { events } from "@/db/schema";
import { desc } from "drizzle-orm";

const SYSTEM_PROMPT = `You are WorldTrue Assistant, a helpful guide for exploring human history.
You have access to a database of historical events shown on a world map.

When users ask about events:
1. Reference specific events from the database when relevant
2. Provide historical context and connections
3. Suggest related events they might find interesting
4. Be accurate - if you're not sure, say so

You can suggest actions that the user can take:
- Searching for specific terms
- Filtering by event type (conflict, discovery, cultural, political, technological)
- Looking at specific time periods

Keep responses concise but informative. Use markdown formatting for better readability.`;

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, eventsContext } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is required" }, { status: 400 });
    }

    // Fetch events from database for context
    let dbEvents = eventsContext;
    if (!dbEvents || dbEvents.length === 0) {
      try {
        const fetchedEvents = await db
          .select({
            id: events.id,
            title: events.title,
            description: events.description,
            year: events.year,
            eventType: events.eventType,
            locationName: events.locationName,
          })
          .from(events)
          .orderBy(desc(events.year))
          .limit(50);
        dbEvents = fetchedEvents;
      } catch {
        dbEvents = [];
      }
    }

    // Build context with events
    const eventsStr = dbEvents.length > 0
      ? `\n\nCurrently available events in the database:\n${JSON.stringify(dbEvents, null, 2)}`
      : "\n\nNote: No events are currently loaded from the database.";

    const fullPrompt = `${SYSTEM_PROMPT}${eventsStr}\n\nUser question: ${message}`;

    // Initialize Gemini with user's API key
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error: any) {
    console.error("Chat API error:", error);

    // Handle specific Gemini errors
    if (error.message?.includes("API_KEY_INVALID")) {
      return NextResponse.json(
        { error: "Invalid Gemini API key. Please check your key and try again." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
