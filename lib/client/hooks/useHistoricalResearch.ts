import { useState, useCallback } from "react";
import { KnowledgeStore } from "../historical-research-agent";

export type ResearchDepth = "quick" | "medium" | "deep";

export type ResearchPhase =
  | "idle"
  | "initializing"
  | "analyzing"
  | "researching"
  | "extracting"
  | "geocoding"
  | "saving"
  | "completed"
  | "failed";

export interface ResearchProgress {
  phase: ResearchPhase;
  message: string;
  percentage?: number;
}

export interface UseHistoricalResearchResult {
  research: (query: string, depth: ResearchDepth) => Promise<ResearchResult>;
  isResearching: boolean;
  progress: ResearchProgress | null;
  knowledgeStore: KnowledgeStore | null;
  error: string | null;
  currentSessionId: string | null;
}

export interface ResearchResult {
  sessionId: string;
  knowledgeStore: KnowledgeStore;
}

export function useHistoricalResearch(apiKey: string): UseHistoricalResearchResult {
  const [isResearching, setIsResearching] = useState(false);
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [knowledgeStore, setKnowledgeStore] = useState<KnowledgeStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const research = useCallback(
    async (query: string, depth: ResearchDepth): Promise<ResearchResult> => {
      setIsResearching(true);
      setError(null);
      setProgress({ phase: "initializing", message: "Starting research..." });

      try {
        // Phase 1: Call server-side research API
        setProgress({ phase: "researching", message: "AI is researching...", percentage: 30 });

        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, apiKey, depth }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Research failed");
        }

        const result = await response.json();

        if (!result.knowledgeStore || !result.knowledgeStore.events) {
          throw new Error("No events found in research results");
        }

        console.log("Research returned", result.knowledgeStore.events.length, "events");

        // Phase 2: Geocoding
        setProgress({ phase: "geocoding", message: "Finding coordinates...", percentage: 70 });
        const geocoded = await geocodeEvents(result.knowledgeStore.events);
        const updatedKnowledgeStore = {
          ...result.knowledgeStore,
          events: geocoded,
        };

        // Phase 3: Done
        const sessionId = crypto.randomUUID();
        setKnowledgeStore(updatedKnowledgeStore);
        setCurrentSessionId(sessionId);
        setProgress({ phase: "completed", message: "Research complete!", percentage: 100 });

        return { sessionId, knowledgeStore: updatedKnowledgeStore };
      } catch (err: any) {
        console.error("Research error:", err);
        setError(err.message || "Research failed");
        setProgress({ phase: "failed", message: err.message || "Research failed" });
        throw err;
      } finally {
        setIsResearching(false);
      }
    },
    [apiKey]
  );

  return {
    research,
    isResearching,
    progress,
    knowledgeStore,
    error,
    currentSessionId,
  };
}

// Helper function to geocode events
async function geocodeEvents(events: any[]): Promise<any[]> {
  const geocoded = [];

  for (const event of events) {
    try {
      // Use the existing geocode API
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: event.location.modernName || event.location.name,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          geocoded.push({
            ...event,
            location: {
              ...event.location,
              coordinates: {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
              },
            },
          });
          continue;
        }
      }
    } catch (err) {
      console.warn(`Failed to geocode ${event.location.name}:`, err);
    }

    // If geocoding failed, keep event without coordinates
    geocoded.push(event);
  }

  return geocoded;
}
