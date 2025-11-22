import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { vertex } from "../lib/vertex";
import { generateText } from "ai";

/**
 * Historical Event Search Tool for WorldTrue
 *
 * Uses Gemini's Google Search grounding to find historical events and cultural context.
 * Enriches results with temporal, geographical, and cultural metadata.
 * Supported models: Gemini 2.5 Flash-Lite, 2.5 Flash, 2.0 Flash, 2.5 Pro
 *
 * This tool enables the agent to search for:
 * - Historical events and their contexts
 * - Cultural artifacts and movements
 * - Geographic and temporal information
 * - Primary sources and references
 */
export const historicalSearchTool = createTool({
  id: "historical-search",
  description: "Search for historical events and cultural context with enriched metadata including dates, locations, and cultural significance. Returns structured data suitable for the WorldTrue knowledge graph.",
  inputSchema: z.object({
    query: z.string().describe("The historical search query (e.g., 'fall of Berlin Wall 1989', 'Renaissance art movement Italy')"),
    timeRange: z.object({
      startYear: z.number().optional().describe("Start year for temporal filtering"),
      endYear: z.number().optional().describe("End year for temporal filtering"),
    }).optional(),
    region: z.string().optional().describe("Geographic region or country to focus on"),
    includeContext: z.boolean().optional().default(true).describe("Include cultural and historical context"),
    maxResults: z.number().optional().default(5).describe("Maximum number of results to return (default: 5)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    events: z.array(z.object({
      title: z.string(),
      description: z.string(),
      date: z.object({
        year: z.number(),
        month: z.number().optional(),
        day: z.number().optional(),
        displayDate: z.string(),
        precision: z.enum(["day", "month", "year", "decade", "century"]),
      }),
      location: z.object({
        name: z.string(),
        coordinates: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }).optional(),
        country: z.string().optional(),
        region: z.string().optional(),
      }),
      impactedPeople: z.object({
        estimated: z.number().optional(),
        description: z.string().optional(),
      }),
      culturalContext: z.array(z.object({
        type: z.enum(["artifact", "movement", "ideology", "technology", "social", "economic", "political"]),
        name: z.string(),
        description: z.string(),
      })),
      sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
        type: z.enum(["primary", "secondary", "tertiary", "web"]),
      })),
      tags: z.array(z.string()),
    })),
    searchQuery: z.string(),
    resultCount: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { query, timeRange, region, includeContext, maxResults } = context;

      // Build enhanced search query
      let searchQuery = query;
      if (region) searchQuery += ` ${region}`;
      if (timeRange?.startYear && timeRange?.endYear) {
        searchQuery += ` ${timeRange.startYear}-${timeRange.endYear}`;
      } else if (timeRange?.startYear) {
        searchQuery += ` after ${timeRange.startYear}`;
      } else if (timeRange?.endYear) {
        searchQuery += ` before ${timeRange.endYear}`;
      }
      if (includeContext) {
        searchQuery += " historical context cultural significance primary sources";
      }

      console.log(`[Historical Search] Searching for: "${searchQuery}" (max ${maxResults} results)`);

      // Use Gemini with Google Search grounding
      const result = await generateText({
        model: vertex("gemini-2.5-flash"),
        tools: { google_search: vertex.tools.googleSearch({}) },
        prompt: `Search for historical information about: ${searchQuery}

Return the top ${maxResults} most relevant historical events in this exact JSON format:
{
  "events": [
    {
      "title": "Event name",
      "description": "Detailed description of the event",
      "date": {
        "year": 1989,
        "month": 11,
        "day": 9,
        "displayDate": "November 9, 1989",
        "precision": "day"
      },
      "location": {
        "name": "Berlin, Germany",
        "coordinates": {
          "latitude": 52.52,
          "longitude": 13.405
        },
        "country": "Germany",
        "region": "Europe"
      },
      "impactedPeople": {
        "estimated": 1000000,
        "description": "Approximately 1 million people directly affected"
      },
      "culturalContext": [
        {
          "type": "political",
          "name": "Cold War",
          "description": "End of Cold War division"
        }
      ],
      "sources": [
        {
          "title": "Source title",
          "url": "https://example.com",
          "type": "secondary"
        }
      ],
      "tags": ["cold war", "german reunification", "1989"]
    }
  ]
}

IMPORTANT INSTRUCTIONS:
- Provide accurate historical dates with appropriate precision (day/month/year/decade/century)
- Include geographic coordinates when possible
- Estimate the number of people impacted by the event
- Identify cultural, political, social, and economic contexts
- Extract clean, direct URLs for sources
- Use appropriate tags for categorization
- Focus on factual, verifiable information
- Include primary sources when available`,
      });

      console.log(`[Historical Search] Raw response length: ${result.text.length} chars`);

      // Parse JSON response
      let parsedResults: { events: any[] } = { events: [] };

      try {
        // Remove markdown code blocks if present
        let jsonText = result.text;
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Try to extract JSON from the cleaned response
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResults = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn("[Historical Search] Could not parse JSON, creating fallback result", parseError);

        // Fallback: Create a basic result from the text
        parsedResults = {
          events: [{
            title: query,
            description: result.text.slice(0, 500),
            date: {
              year: new Date().getFullYear(),
              displayDate: "Unknown date",
              precision: "century" as const,
            },
            location: {
              name: region || "Unknown location",
            },
            impactedPeople: {
              description: "Unknown impact",
            },
            culturalContext: [],
            sources: [{
              title: "Search result",
              url: "",
              type: "web" as const,
            }],
            tags: [query.toLowerCase()],
          }]
        };
      }

      const events = parsedResults.events.slice(0, maxResults);

      console.log(`[Historical Search] Found ${events.length} historical events`);

      return {
        success: true,
        events,
        searchQuery,
        resultCount: events.length,
      };
    } catch (error) {
      console.error("[Historical Search] Error:", error);
      return {
        success: false,
        events: [],
        searchQuery: context.query,
        resultCount: 0,
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});