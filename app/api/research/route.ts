import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type ResearchDepth = "quick" | "medium" | "deep";

const eventCounts = {
  quick: "5-10",
  medium: "15-25",
  deep: "40-60",
};

function buildInstructions(depth: ResearchDepth): string {
  return `You are a WorldTrue Historical Research Agent. Your task is to research historical topics and return structured data about events.

RESEARCH DEPTH: ${depth.toUpperCase()} - Return ${eventCounts[depth]} events

IMPORTANT: You must respond with ONLY a valid JSON object. No markdown, no explanations, just JSON.

JSON STRUCTURE:
{
  "topic": {
    "name": "Topic Name",
    "description": "Brief description of the topic",
    "aliases": ["Alternative names"],
    "timeframe": { "start": 1119, "end": 1312 },
    "regions": ["Europe", "Middle East"]
  },
  "events": [
    {
      "id": "evt-001",
      "title": "Short Event Title (3-8 words)",
      "description": "2-3 sentences with historical context",
      "date": {
        "year": 1119,
        "month": 3,
        "day": 14,
        "precision": "year",
        "circa": false
      },
      "location": {
        "name": "Historical location name",
        "modernName": "Modern city/country for geocoding",
        "coordinates": null,
        "country": "Country",
        "region": "Region"
      },
      "type": "conflict",
      "significance": 8,
      "participants": ["Person 1", "Group 2"],
      "sources": [],
      "confidence": 0.9
    }
  ],
  "entities": [],
  "relationships": [],
  "timeline": []
}

EVENT TYPES: conflict, discovery, cultural, political, technological

RULES:
1. Return ONLY valid JSON - no markdown code fences, no extra text
2. Include ${eventCounts[depth]} events with accurate historical data
3. Use modernName for geocoding (e.g., "Rome, Italy" not just "Rome")
4. Year is required; month/day optional
5. Significance: 1-10 (10 = most important)
6. Type must be one of: conflict, discovery, cultural, political, technological`;
}

export async function POST(request: NextRequest) {
  try {
    const { query, apiKey, depth = "medium" } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `${buildInstructions(depth)}\n\nRESEARCH QUERY: ${query}\n\nRespond with JSON only:`;

    console.log("=== Research API ===");
    console.log("Query:", query);
    console.log("Depth:", depth);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("Response length:", text.length);
    console.log("First 500 chars:", text.substring(0, 500));

    // Parse the JSON response
    let knowledgeStore;
    try {
      // Try to extract JSON from code fence if present
      const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        knowledgeStore = JSON.parse(jsonMatch[1]);
      } else {
        knowledgeStore = JSON.parse(text);
      }
    } catch (parseError: any) {
      console.error("JSON parse error:", parseError.message);
      console.error("Raw response:", text.substring(0, 1000));

      return NextResponse.json({
        error: "Failed to parse research results",
        rawResponse: text.substring(0, 500),
      }, { status: 500 });
    }

    console.log("Events found:", knowledgeStore.events?.length || 0);

    return NextResponse.json({
      knowledgeStore,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    });
  } catch (error: any) {
    console.error("Research API error:", error);

    if (error.message?.includes("API_KEY")) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    return NextResponse.json(
      { error: error.message || "Research failed" },
      { status: 500 }
    );
  }
}
