"use client";

import { useState } from "react";
import { X, Search, Plus, Loader2, ChevronRight } from "lucide-react";

interface MapEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  year: number;
  type: "conflict" | "discovery" | "cultural" | "political" | "technological";
}

interface SuggestedEvent {
  title: string;
  description: string;
  year: number;
  location: string;
  type: string;
}

interface SuggestedEventWithSource extends SuggestedEvent {
  sourceEventId: string;
  sourceEventTitle: string;
}

interface EventListPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  events: MapEvent[];
  onEventHover: (eventId: string | null) => void;
  apiKey?: string;
  onEventsCreated?: () => void;
  pendingEvents?: SuggestedEventWithSource[];
  onRemovePendingEvent?: (title: string) => void;
  isSearching?: boolean;
}

const typeColors: Record<string, string> = {
  conflict: "#ef4444",
  discovery: "#3b82f6",
  cultural: "#a855f7",
  political: "#f59e0b",
  technological: "#10b981",
};

export default function EventListPopover({
  isOpen,
  onClose,
  events,
  onEventHover,
  apiKey,
  onEventsCreated,
  pendingEvents = [],
  onRemovePendingEvent,
  isSearching: isSearchingProp = false,
}: EventListPopoverProps) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  const [suggestedEvents, setSuggestedEvents] = useState<SuggestedEvent[]>([]);
  const [addingEvent, setAddingEvent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "pending">("events");

  if (!isOpen) return null;

  // Sort events by year
  const sortedEvents = [...events].sort((a, b) => a.year - b.year);

  const handleFindMore = async (event: MapEvent) => {
    if (!apiKey) return;

    setExpandedEventId(event.id);
    setIsSearchingLocal(true);
    setSuggestedEvents([]);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Find 5 historical events similar to "${event.title}" (${event.year}) - same time period, region, or topic. Focus on related events, causes, or consequences.`,
          apiKey,
          depth: "quick",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const researchEvents = data.knowledgeStore?.events || [];
        setSuggestedEvents(
          researchEvents.slice(0, 5).map((e: any) => ({
            title: e.title,
            description: e.description,
            year: e.date?.year,
            location: e.location?.modernName || e.location?.name,
            type: e.type,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to find similar events:", error);
    } finally {
      setIsSearchingLocal(false);
    }
  };

  const handleAddEvent = async (suggestedEvent: SuggestedEvent) => {
    if (!apiKey) return;

    setAddingEvent(suggestedEvent.title);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Create this single event on the map: "${suggestedEvent.title}" (${suggestedEvent.year}) at ${suggestedEvent.location}. Type: ${suggestedEvent.type}. Description: ${suggestedEvent.description}. Geocode the location first, then create the event.`,
          apiKey,
          conversation: [],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.createdEvents?.length > 0) {
          onEventsCreated?.();
          setSuggestedEvents((prev) =>
            prev.filter((e) => e.title !== suggestedEvent.title)
          );
        }
      }
    } catch (error) {
      console.error("Failed to add event:", error);
    } finally {
      setAddingEvent(null);
    }
  };

  const formatYear = (year: number) => {
    if (year < 0) return `${Math.abs(year)} BCE`;
    return `${year} CE`;
  };

  // Add pending event to map
  const handleAddPendingEvent = async (pendingEvent: SuggestedEventWithSource) => {
    if (!apiKey) return;

    setAddingEvent(pendingEvent.title);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Create this single event on the map: "${pendingEvent.title}" (${pendingEvent.year}) at ${pendingEvent.location}. Type: ${pendingEvent.type}. Description: ${pendingEvent.description}. Geocode the location first, then create the event.`,
          apiKey,
          conversation: [],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.createdEvents?.length > 0) {
          onEventsCreated?.();
          onRemovePendingEvent?.(pendingEvent.title);
        }
      }
    } catch (error) {
      console.error("Failed to add event:", error);
    } finally {
      setAddingEvent(null);
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 md:absolute md:bottom-6 md:left-6 md:right-auto z-20">
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-t-2xl md:rounded-xl shadow-2xl w-full md:w-80 max-h-[60vh] md:max-h-[70vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {isSearchingProp && (
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            )}
            <span className="text-white font-semibold">{events.length}</span>
            <span className="text-gray-400 text-sm">events</span>
            {pendingEvents.length > 0 && (
              <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                +{pendingEvents.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        {pendingEvents.length > 0 && (
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab("events")}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === "events"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              On Map ({events.length})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === "pending"
                  ? "text-white border-b-2 border-purple-500"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Suggested ({pendingEvents.length})
            </button>
          </div>
        )}

        {/* Events List */}
        <div className="flex-1 overflow-y-auto">
          {/* Pending Events Tab */}
          {activeTab === "pending" && pendingEvents.length > 0 && (
            <div className="p-2 space-y-2">
              {pendingEvents.map((pending, idx) => (
                <div
                  key={`${pending.title}-${idx}`}
                  className="bg-gray-800/50 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: typeColors[pending.type] || "#6b7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        {pending.title}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {pending.year} • {pending.location}
                      </p>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                        {pending.description}
                      </p>
                      <p className="text-purple-400 text-xs mt-1">
                        Related to: {pending.sourceEventTitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAddPendingEvent(pending)}
                      disabled={addingEvent === pending.title}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {addingEvent === pending.title ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      Add to Map
                    </button>
                    <button
                      onClick={() => onRemovePendingEvent?.(pending.title)}
                      className="px-3 py-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg text-xs transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Events on Map Tab */}
          {(activeTab === "events" || pendingEvents.length === 0) &&
            sortedEvents.map((event) => (
            <div key={event.id}>
              <div
                className="px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors"
                onMouseEnter={() => onEventHover(event.id)}
                onMouseLeave={() => onEventHover(null)}
              >
                <div className="flex items-start gap-3">
                  {/* Type indicator */}
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: typeColors[event.type] }}
                  />

                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium leading-tight truncate">
                      {event.title}
                    </h4>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatYear(event.year)}
                    </p>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  </div>

                  {/* More button */}
                  {apiKey && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (expandedEventId === event.id) {
                          setExpandedEventId(null);
                          setSuggestedEvents([]);
                        } else {
                          handleFindMore(event);
                        }
                      }}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                      title="Find similar events"
                    >
                      {isSearchingLocal && expandedEventId === event.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            expandedEventId === event.id ? "rotate-90" : ""
                          }`}
                        />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded section with suggested events */}
              {expandedEventId === event.id && (
                <div className="px-4 py-2 bg-gray-800/30 border-b border-gray-800/50">
                  {isSearchingLocal ? (
                    <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Finding similar events...</span>
                    </div>
                  ) : suggestedEvents.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Related events
                      </p>
                      {suggestedEvents.map((suggested, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 bg-gray-800/50 rounded-lg p-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">
                              {suggested.title}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {suggested.year} • {suggested.location}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddEvent(suggested)}
                            disabled={addingEvent === suggested.title}
                            className="flex-shrink-0 p-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded text-green-400 transition-colors disabled:opacity-50"
                            title="Add to map"
                          >
                            {addingEvent === suggested.title ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs py-2">
                      No similar events found
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
