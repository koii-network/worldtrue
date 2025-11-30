"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Search, Plus, X, Loader2, ExternalLink } from "lucide-react";

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

// Cache for similar events to make subsequent searches instant
const similarEventsCache: { [key: string]: SuggestedEvent[] } = {};

// Generate Wikipedia search URL for an event
const getWikipediaUrl = (title: string, year: number) => {
  const yearStr = year < 0 ? `${Math.abs(year)} BC` : `${year}`;
  const searchTerm = `${title}`;
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(searchTerm)}&go=Go`;
};

export interface SuggestedEventWithSource extends SuggestedEvent {
  sourceEventId: string;
  sourceEventTitle: string;
}

interface MapProps {
  events?: MapEvent[];
  onEventClick?: (event: MapEvent) => void;
  selectMode?: boolean;
  onLocationSelect?: (location: { lat: number; lng: number }) => void;
  pendingLocation?: { lat: number; lng: number } | null;
  apiKey?: string;
  onEventsCreated?: () => void;
  highlightedEventId?: string | null;
  onSearchingChange?: (isSearching: boolean) => void;
  onSuggestedEventsFound?: (events: SuggestedEventWithSource[]) => void;
}

const typeColors: Record<string, string> = {
  conflict: "#ef4444",
  discovery: "#3b82f6",
  cultural: "#a855f7",
  political: "#f59e0b",
  technological: "#10b981",
};

export default function Map({
  events = [],
  onEventClick,
  selectMode = false,
  onLocationSelect,
  pendingLocation,
  apiKey,
  onEventsCreated,
  highlightedEventId,
  onSearchingChange,
  onSuggestedEventsFound,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const markerElementsRef = useRef<{ [key: string]: HTMLDivElement }>({});
  const pendingMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Hover popup state
  const [hoveredEvent, setHoveredEvent] = useState<MapEvent | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [isMarkerHovered, setIsMarkerHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find more state
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedEvents, setSuggestedEvents] = useState<SuggestedEvent[]>([]);
  const [addingEvent, setAddingEvent] = useState<string | null>(null);

  // Show popup when either marker or popup is hovered
  const showPopup = isMarkerHovered || isPopupHovered;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [
          {
            id: "carto-dark-layer",
            type: "raster",
            source: "carto-dark",
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [0, 20],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 18,
    });

    map.current.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );

    map.current.on("load", () => setLoaded(true));

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Handle map clicks for location selection
  useEffect(() => {
    if (!map.current || !loaded) return;

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      if (selectMode && onLocationSelect) {
        onLocationSelect({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    };

    map.current.on("click", handleClick);

    if (selectMode) {
      map.current.getCanvas().style.cursor = "crosshair";
    } else {
      map.current.getCanvas().style.cursor = "";
    }

    return () => {
      map.current?.off("click", handleClick);
    };
  }, [loaded, selectMode, onLocationSelect]);

  // Handle pending location marker
  useEffect(() => {
    if (!map.current || !loaded) return;

    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.remove();
      pendingMarkerRef.current = null;
    }

    if (pendingLocation) {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background: #a855f7;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 20px #a855f7, 0 0 40px #a855f780;
        animation: pulse-marker 1.5s ease-in-out infinite;
      `;

      pendingMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([pendingLocation.lng, pendingLocation.lat])
        .addTo(map.current);
    }
  }, [loaded, pendingLocation]);

  // Update markers when events change
  useEffect(() => {
    if (!map.current || !loaded) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    markerElementsRef.current = {};

    events.forEach((event) => {
      // Create outer container for larger hit area
      const container = document.createElement("div");
      container.style.cssText = `
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
      `;

      // Inner visible dot
      const dot = document.createElement("div");
      dot.className = "event-marker-dot";
      dot.dataset.eventId = event.id;
      dot.style.cssText = `
        width: 14px;
        height: 14px;
        background: ${typeColors[event.type]};
        border: 2px solid rgba(255,255,255,0.8);
        border-radius: 50%;
        box-shadow: 0 0 12px ${typeColors[event.type]}80;
        transition: box-shadow 0.3s, border-color 0.3s, transform 0.3s;
        pointer-events: none;
      `;

      container.appendChild(dot);
      markerElementsRef.current[event.id] = dot;

      container.addEventListener("mouseenter", () => {
        // Enhanced glow effect on hover (no transform)
        dot.style.boxShadow = `0 0 20px ${typeColors[event.type]}, 0 0 30px ${typeColors[event.type]}60`;
        dot.style.borderColor = "white";

        const rect = container.getBoundingClientRect();
        setPopupPosition({ x: rect.left + rect.width / 2, y: rect.top });
        setHoveredEvent(event);
        setIsMarkerHovered(true);
        setSuggestedEvents([]);
      });

      container.addEventListener("mouseleave", () => {
        // Reset to normal glow
        dot.style.boxShadow = `0 0 12px ${typeColors[event.type]}80`;
        dot.style.borderColor = "rgba(255,255,255,0.8)";

        // Delay hiding to allow mouse to move to popup
        hoverTimeoutRef.current = setTimeout(() => {
          setIsMarkerHovered(false);
        }, 150);
      });

      const marker = new maplibregl.Marker({ element: container })
        .setLngLat([event.lng, event.lat])
        .addTo(map.current!);

      if (onEventClick) {
        container.addEventListener("click", () => onEventClick(event));
      }

      markersRef.current.push(marker);
    });
  }, [events, loaded, onEventClick]);

  // Handle external highlight from events list popover
  useEffect(() => {
    if (!loaded || !map.current) return;

    // Reset all markers first
    Object.entries(markerElementsRef.current).forEach(([eventId, dot]) => {
      const event = events.find(e => e.id === eventId);
      if (event) {
        dot.style.boxShadow = `0 0 12px ${typeColors[event.type]}80`;
        dot.style.borderColor = "rgba(255,255,255,0.8)";
        dot.style.transform = "scale(1)";
      }
    });

    // Apply highlight to selected marker and fly to it if not in view
    if (highlightedEventId) {
      const dot = markerElementsRef.current[highlightedEventId];
      const event = events.find(e => e.id === highlightedEventId);
      if (dot && event) {
        // Light blue glow with 60% opacity drop shadow
        dot.style.boxShadow = `0 0 25px rgba(96, 165, 250, 0.6), 0 0 50px rgba(96, 165, 250, 0.4), 0 4px 20px rgba(96, 165, 250, 0.3)`;
        dot.style.borderColor = "#60a5fa";
        dot.style.transform = "scale(1.3)";

        // Check if event is in view, if not fly to it smoothly
        const bounds = map.current.getBounds();
        const eventLngLat = new maplibregl.LngLat(event.lng, event.lat);

        if (!bounds.contains(eventLngLat)) {
          // Event is not in view - fly to it smoothly
          map.current.flyTo({
            center: [event.lng, event.lat],
            zoom: Math.max(map.current.getZoom(), 4),
            duration: 1500,
            essential: true,
          });
        }
      }
    }
  }, [highlightedEventId, loaded, events]);

  // Clear hover timeout when popup is hovered
  useEffect(() => {
    if (isPopupHovered && hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, [isPopupHovered]);

  // Find similar events with caching for instant second clicks
  const handleFindMore = async () => {
    if (!hoveredEvent || !apiKey) return;

    const cacheKey = `${hoveredEvent.id}-${hoveredEvent.title}`;

    // Check cache first - instant response
    const cached = similarEventsCache[cacheKey];
    if (cached && cached.length > 0) {
      setSuggestedEvents(cached);
      // Also notify parent about cached events
      if (onSuggestedEventsFound) {
        const withSource = cached.map(e => ({
          ...e,
          sourceEventId: hoveredEvent.id,
          sourceEventTitle: hoveredEvent.title,
        }));
        onSuggestedEventsFound(withSource);
      }
      return;
    }

    setIsSearching(true);
    onSearchingChange?.(true);
    setSuggestedEvents([]);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Find 5 historical events similar to "${hoveredEvent.title}" (${hoveredEvent.year}) - same time period, region, or topic. Focus on related events, causes, or consequences.`,
          apiKey,
          depth: "quick",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const researchEvents = data.knowledgeStore?.events || [];
        const suggested = researchEvents.slice(0, 5).map((e: any) => ({
          title: e.title,
          description: e.description,
          year: e.date?.year,
          location: e.location?.modernName || e.location?.name,
          type: e.type,
        }));

        // Cache the results for instant subsequent access
        similarEventsCache[cacheKey] = suggested;
        setSuggestedEvents(suggested);

        // Notify parent about new suggested events
        if (onSuggestedEventsFound && suggested.length > 0) {
          const withSource = suggested.map((e: SuggestedEvent) => ({
            ...e,
            sourceEventId: hoveredEvent.id,
            sourceEventTitle: hoveredEvent.title,
          }));
          onSuggestedEventsFound(withSource);
        }
      }
    } catch (error) {
      console.error("Failed to find similar events:", error);
    } finally {
      setIsSearching(false);
      onSearchingChange?.(false);
    }
  };

  // Add a suggested event
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
          // Remove from suggestions
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

  return (
    <>
      <style jsx global>{`
        .maplibregl-ctrl-group {
          background: rgba(17, 24, 39, 0.9) !important;
          border: 1px solid rgba(75, 85, 99, 0.5) !important;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
        }
        .maplibregl-ctrl-group button:hover {
          background: rgba(75, 85, 99, 0.5) !important;
        }
        .maplibregl-ctrl-group button + button {
          border-top: 1px solid rgba(75, 85, 99, 0.5) !important;
        }
        .maplibregl-ctrl button .maplibregl-ctrl-icon {
          filter: invert(1);
        }
      `}</style>

      <div ref={mapContainer} className="w-full h-full" />

      {/* Custom Hover Popup */}
      {showPopup && hoveredEvent && (
        <div
          className="fixed z-50 pointer-events-auto"
          style={{
            left: popupPosition.x,
            top: popupPosition.y - 10,
            transform: "translate(-50%, -100%)",
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
            setIsPopupHovered(true);
          }}
          onMouseLeave={() => {
            setIsPopupHovered(false);
            setIsMarkerHovered(false);
          }}
        >
          <div className="bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm max-w-sm">
            {/* Event Details */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white text-sm leading-tight">
                  {hoveredEvent.title}
                </h3>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${typeColors[hoveredEvent.type]}20`,
                    color: typeColors[hoveredEvent.type],
                  }}
                >
                  {hoveredEvent.type}
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-1">{hoveredEvent.year}</p>
              <p className="text-gray-300 text-xs mt-2 line-clamp-3">
                {hoveredEvent.description}
              </p>

              {/* Wikipedia Link */}
              <a
                href={getWikipediaUrl(hoveredEvent.title, hoveredEvent.year)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View on Wikipedia
              </a>

              {/* Find More Button */}
              {apiKey && (
                <button
                  onClick={handleFindMore}
                  disabled={isSearching}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3" />
                      Find Similar Events
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Suggested Events */}
            {suggestedEvents.length > 0 && (
              <div className="border-t border-gray-700 p-3 max-h-64 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-2">Related events:</p>
                <div className="space-y-2">
                  {suggestedEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800/50 rounded-lg p-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">
                            {event.title}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {event.year} • {event.location}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <a
                            href={getWikipediaUrl(event.title, event.year)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 p-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-blue-400 transition-colors"
                            title="View on Wikipedia"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleAddEvent(event)}
                            disabled={addingEvent === event.title}
                            className="flex-shrink-0 p-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded text-green-400 transition-colors disabled:opacity-50"
                            title="Add to map"
                          >
                            {addingEvent === event.title ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Arrow */}
            <div
              className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid rgb(17, 24, 39)",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
