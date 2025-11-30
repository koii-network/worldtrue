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
