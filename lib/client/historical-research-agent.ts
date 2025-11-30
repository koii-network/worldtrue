import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";

export type ResearchDepth = "quick" | "medium" | "deep";

export interface HistoricalEvent {
  id: string;
  title: string;
  description: string;
  date: {
    year: number;
    month?: number;
    day?: number;
    precision: "day" | "month" | "year" | "decade" | "century";
    circa: boolean;
  };
  location: {
    name: string;
    modernName: string;
    coordinates: {
      lat: number;
      lng: number;
    } | null;
    country: string;
    region: string;
  };
  type: "conflict" | "discovery" | "cultural" | "political" | "technological";
  significance: number;
  participants: string[];
  sources: string[];
  confidence: number;
}

export interface Entity {
  id: string;
  name: string;
  type: "person" | "organization" | "location" | "artifact";
  description: string;
  aliases: string[];
  lifespan?: {
    born: number;
    died: number | null;
  };
  relatedEvents: string[];
}

export interface KnowledgeStore {
  topic: {
    name: string;
    description: string;
    aliases: string[];
    timeframe: {
      start: number;
      end: number | null;
    };
    regions: string[];
  };
  events: HistoricalEvent[];
  entities: Entity[];
  relationships: Array<{
    id: string;
    type: "founded" | "participated_in" | "located_at" | "preceded" | "caused" | "influenced";
    from: string;
    to: string;
    description: string;
  }>;
  timeline: Array<{
    year: number;
    month?: number;
    day?: number;
    events: string[];
    significance: number;
  }>;
}

export interface ResearchResult {
  response: string;
  knowledgeStore: KnowledgeStore;
  webSources?: Array<{
    url: string;
    title: string;
    snippet: string;
    relevanceScore: number;
  }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export class HistoricalResearchAgent {
  private google;
  private instructions: string;
  private tools: Record<string, any>;
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private depth: ResearchDepth;

  constructor(config: {
    apiKey: string;
    depth: ResearchDepth;
  }) {
    this.google = createGoogleGenerativeAI({
      apiKey: config.apiKey,
    });

    this.depth = config.depth;
    this.instructions = this.buildInstructions(config.depth);
    this.tools = this.buildTools();
  }

  private buildInstructions(depth: ResearchDepth): string {
    const eventCounts = {
      quick: "5-10 key events",
      medium: "15-25 important events",
      deep: "40-60 comprehensive events",
    };

    return `You are a WorldTrue Historical Research Agent specializing in mapping historical events.

RESEARCH DEPTH: ${depth.toUpperCase()} (Target: ${eventCounts[depth]})

Your workflow:
1. ANALYZE the user's query to identify:
   - Main topic (e.g., "Knights Templar")
   - Geographic scope (global, region, country)
   - Time period
   - Event types of interest

2. RESEARCH phase:
   - Use your historical knowledge AND web search to identify key events
   - For ${depth} mode: Focus on ${eventCounts[depth]}
   - Include: founding, major events, key locations, important dates
   - Cite sources from web search results

3. STRUCTURE phase:
   - For each event, extract:
     * Title (concise, 3-8 words)
     * Description (2-3 sentences with historical context)
     * Date (year required, month/day if known)
     * Location name (specific as possible)
     * Event type (conflict, cultural, political, discovery, technological)
     * Sources/references from web

4. OUTPUT format:
   - Return a valid JSON object with this structure:
   {
     "topic": {
       "name": "Topic Name",
       "description": "Brief description",
       "aliases": ["Alternative names"],
       "timeframe": { "start": 1119, "end": 1312 },
       "regions": ["Europe", "Middle East"]
     },
     "events": [
       {
         "id": "evt-001",
         "title": "Event Title",
         "description": "Detailed description with context...",
         "date": {
           "year": 1119,
           "month": 3,
           "day": 14,
           "precision": "day",
           "circa": false
         },
         "location": {
           "name": "Historical name",
           "modernName": "Modern name for geocoding",
           "coordinates": null,
           "country": "Country",
           "region": "Region"
         },
         "type": "cultural",
         "significance": 10,
         "participants": [],
         "sources": ["https://..."],
         "confidence": 0.95
       }
     ],
     "entities": [],
     "relationships": [],
     "timeline": []
   }

Special considerations:
- Use web search to find current, accurate information
- Many locations have changed names (e.g., Constantinople → Istanbul)
- Provide historical context in descriptions
- Cite sources when possible
- Mark uncertain dates with "circa": true
- Significance is 1-10 (10 being most significant)
- Confidence is 0-1 (1 being absolutely certain)

Remember: You're creating a historical map. Accuracy and sources matter!`;
  }

  private buildTools() {
    return {
      analyzeQuery: tool({
        description: "Analyze user query to extract research parameters",
        parameters: z.object({
          topic: z.string(),
          timeframe: z.object({
            start: z.number().optional(),
            end: z.number().optional(),
          }),
          regions: z.array(z.string()),
          focusAreas: z.array(z.string()),
        }),
        execute: async (params) => ({
          success: true,
          analysis: params,
        }),
      }),
    };
  }

  async research(query: string): Promise<ResearchResult> {
    const messages = [
      { role: "system" as const, content: this.instructions },
      ...this.conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: query },
    ];

    try {
      const result = await generateText({
        model: this.google("gemini-2.5-flash"),
        messages,
        tools: this.tools,
      });

      this.conversationHistory.push(
        { role: "user", content: query },
        { role: "assistant", content: result.text }
      );

      // Extract knowledge store from response
      const knowledgeStore = this.extractKnowledgeStore(result.text);

      return {
        response: result.text,
        knowledgeStore,
        usage: {
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
        },
      };
    } catch (error) {
      console.error("Research error:", error);
      throw error;
    }
  }

  private extractKnowledgeStore(response: string): KnowledgeStore {
    // Try to parse JSON from response
    try {
      // Look for JSON block in markdown code fence
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to parse entire response as JSON
      const parsed = JSON.parse(response);
      if (parsed.topic && parsed.events) {
        return parsed;
      }
    } catch (e) {
      console.warn("Failed to parse knowledge store from response:", e);
    }

    // Return minimal structure if parsing fails
    return {
      topic: {
        name: "Research Results",
        description: "Failed to parse structured data",
        aliases: [],
        timeframe: { start: 0, end: null },
        regions: [],
      },
      events: [],
      entities: [],
      relationships: [],
      timeline: [],
    };
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}
