"use client";

import { useState, useEffect } from "react";
import { useHistoricalResearch, ResearchDepth } from "@/lib/client/hooks/useHistoricalResearch";
import { Search, Sparkles, MapPin, Clock, Globe, X, Check } from "lucide-react";

interface ResearchPanelProps {
  apiKey: string;
  onEventsCreated?: () => void;
}

interface PlotProgress {
  phase: "idle" | "interpreting" | "plotting" | "completed" | "failed";
  message: string;
  eventsCreated: number;
}

export default function ResearchPanel({ apiKey, onEventsCreated }: ResearchPanelProps) {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<ResearchDepth>("medium");
  const [showPreview, setShowPreview] = useState(false);
  const [isPlotting, setIsPlotting] = useState(false);
  const [plotProgress, setPlotProgress] = useState<PlotProgress>({
    phase: "idle",
    message: "",
    eventsCreated: 0,
  });

  const { research, isResearching, progress, knowledgeStore, error, currentSessionId } =
    useHistoricalResearch(apiKey);

  const handleResearch = async () => {
    if (!query.trim()) return;

    try {
      await research(query, depth);
      setShowPreview(true);
    } catch (err) {
      console.error("Research failed:", err);
    }
  };

  const handleConfirmAndPlot = async () => {
    if (!knowledgeStore || !currentSessionId || !apiKey) return;

    setIsPlotting(true);
    setPlotProgress({ phase: "interpreting", message: "AI is interpreting research data...", eventsCreated: 0 });

    try {
      // Format events for Gemini to interpret and plot
      const eventsToPlot = knowledgeStore.events.map((e) => ({
        title: e.title,
        description: e.description,
        year: e.date.year,
        month: e.date.month,
        day: e.date.day,
        locationName: e.location.modernName || e.location.name,
        historicalLocation: e.location.name,
        country: e.location.country,
        eventType: e.type,
      }));

      // Use the agent API with Gemini to interpret and create events
      const prompt = `I have researched "${knowledgeStore.topic.name}" and found the following historical events.
Please geocode each location and create the events on the map.

EVENTS TO PLOT:
${eventsToPlot.map((e, i) => `
${i + 1}. "${e.title}" (${e.year})
   Location: ${e.locationName}${e.country ? `, ${e.country}` : ""}
   Description: ${e.description}
   Type: ${e.eventType}
`).join("")}

INSTRUCTIONS:
1. For each event above, call geocode() with the location name
2. Then call createEvent() with the geocoded coordinates and event details
3. Process ALL events - do not skip any
4. After creating all events, provide a brief summary

Start now - geocode and create each event.`;

      setPlotProgress({ phase: "plotting", message: "Creating events on map...", eventsCreated: 0 });

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          apiKey,
          conversation: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to plot events");
      }

      const result = await response.json();
      const eventsCreated = result.createdEvents?.length || 0;

      setPlotProgress({
        phase: "completed",
        message: `Successfully created ${eventsCreated} events!`,
        eventsCreated,
      });

      // Close preview after short delay to show success
      setTimeout(() => {
        setShowPreview(false);
        setQuery("");
        setPlotProgress({ phase: "idle", message: "", eventsCreated: 0 });
        onEventsCreated?.();
      }, 1500);

    } catch (err: any) {
      console.error("Failed to plot events:", err);
      setPlotProgress({
        phase: "failed",
        message: err.message || "Failed to plot events",
        eventsCreated: 0,
      });
    } finally {
      setIsPlotting(false);
    }
  };

  const depthOptions = [
    { value: "quick" as ResearchDepth, label: "Quick", count: "5-10 events" },
    { value: "medium" as ResearchDepth, label: "Medium", count: "15-25 events" },
    { value: "deep" as ResearchDepth, label: "Deep", count: "40-60 events" },
  ];

  const phaseLabels = {
    idle: "Ready",
    initializing: "Initializing...",
    analyzing: "Analyzing query...",
    researching: "Researching with AI...",
    extracting: "Extracting events...",
    geocoding: "Finding locations...",
    saving: "Saving results...",
    completed: "Complete!",
    failed: "Failed",
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">AI Historical Research</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Research any historical topic and plot it on the map using AI-powered web search
        </p>
      </div>

      {/* Research Input */}
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Research Query</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isResearching && handleResearch()}
              placeholder="e.g., plot the knights templar based on research on the map"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              disabled={isResearching}
            />
          </div>
        </div>

        {/* Depth Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Research Depth</label>
          <div className="grid grid-cols-3 gap-3">
            {depthOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDepth(option.value)}
                disabled={isResearching}
                className={`p-3 rounded-lg border-2 transition-all ${
                  depth === option.value
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-gray-700 bg-gray-800 hover:border-gray-600"
                } disabled:opacity-50`}
              >
                <div className="text-white font-medium text-sm">{option.label}</div>
                <div className="text-gray-400 text-xs mt-1">{option.count}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Research Button */}
        <button
          onClick={handleResearch}
          disabled={!query.trim() || !apiKey || isResearching}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-lg transition-colors font-medium"
        >
          {isResearching ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {progress?.message || "Researching..."}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Research & Plot
            </>
          )}
        </button>

        {!apiKey && (
          <p className="text-sm text-orange-400 text-center">
            Please add your Gemini API key in Settings first
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {progress && progress.phase !== "idle" && (
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{phaseLabels[progress.phase]}</span>
              {progress.percentage !== undefined && (
                <span className="text-gray-400">{progress.percentage}%</span>
              )}
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && knowledgeStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPreview(false)} />

          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-semibold text-white">Research Results</h3>
                <p className="text-sm text-gray-400 mt-1">{knowledgeStore.topic.name}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-medium">Events</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{knowledgeStore.events.length}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Time Span</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {knowledgeStore.topic.timeframe.start}-
                    {knowledgeStore.topic.timeframe.end || "Present"}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Globe className="w-4 h-4" />
                    <span className="text-xs font-medium">Regions</span>
                  </div>
                  <div className="text-sm font-medium text-white">
                    {knowledgeStore.topic.regions.slice(0, 2).join(", ")}
                  </div>
                </div>
              </div>

              {/* Events List */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Events Preview</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {knowledgeStore.events.slice(0, 10).map((event, idx) => (
                    <div key={event.id} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-medium">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="text-white font-medium text-sm">{event.title}</h5>
                            <span className="text-gray-400 text-xs whitespace-nowrap">{event.date.year}</span>
                          </div>
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{event.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <MapPin className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-500 text-xs">{event.location.name}</span>
                            {event.location.coordinates && (
                              <Check className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {knowledgeStore.events.length > 10 && (
                    <p className="text-center text-gray-500 text-sm py-2">
                      +{knowledgeStore.events.length - 10} more events
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-800 px-6 py-4 space-y-3">
              {/* Plotting Progress */}
              {plotProgress.phase !== "idle" && (
                <div className={`p-3 rounded-lg ${
                  plotProgress.phase === "failed"
                    ? "bg-red-900/20 border border-red-800"
                    : plotProgress.phase === "completed"
                    ? "bg-green-900/20 border border-green-800"
                    : "bg-purple-900/20 border border-purple-800"
                }`}>
                  <div className="flex items-center gap-2">
                    {plotProgress.phase === "interpreting" || plotProgress.phase === "plotting" ? (
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    ) : plotProgress.phase === "completed" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <X className="w-4 h-4 text-red-400" />
                    )}
                    <span className={`text-sm ${
                      plotProgress.phase === "failed" ? "text-red-400"
                      : plotProgress.phase === "completed" ? "text-green-400"
                      : "text-purple-400"
                    }`}>
                      {plotProgress.message}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPlotProgress({ phase: "idle", message: "", eventsCreated: 0 });
                  }}
                  disabled={isPlotting}
                  className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAndPlot}
                  disabled={isPlotting || plotProgress.phase === "completed"}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isPlotting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Plotting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Plot on Map (AI)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
