"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Tag, Folder, Clock, MapPin, TrendingUp } from "lucide-react";

interface MapEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  year: number;
  type: string;
  tags?: string[];
  locationName?: string;
  country?: string;
}

interface SearchDropdownProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  events: MapEvent[];
  onTopicSelect: (topic: string) => void;
  onTypeSelect: (type: string) => void;
  selectedTypes: string[];
  eventTypes: { id: string; label: string; color: string }[];
}

// Group events by era/time period
function getTimePeriod(year: number): string {
  if (year < -3000) return "Ancient (Pre-3000 BCE)";
  if (year < -500) return "Ancient (3000-500 BCE)";
  if (year < 500) return "Classical Era";
  if (year < 1500) return "Medieval Era";
  if (year < 1800) return "Early Modern";
  if (year < 1900) return "19th Century";
  if (year < 2000) return "20th Century";
  return "21st Century";
}

// Group events by region based on coordinates
function getRegion(lat: number, lng: number): string {
  if (lat > 35 && lng > -10 && lng < 40) return "Europe";
  if (lat > 20 && lat < 50 && lng > 100 && lng < 150) return "East Asia";
  if (lat > 5 && lat < 35 && lng > 60 && lng < 100) return "South Asia";
  if (lat > 20 && lat < 40 && lng > -130 && lng < -60) return "North America";
  if (lat > -60 && lat < 15 && lng > -85 && lng < -30) return "South America";
  if (lat > -40 && lat < 40 && lng > -20 && lng < 55) return "Africa";
  if (lat > 10 && lat < 45 && lng > 25 && lng < 65) return "Middle East";
  if (lat > -50 && lat < 0 && lng > 110 && lng < 180) return "Oceania";
  return "Other";
}

export default function SearchDropdown({
  searchQuery,
  onSearchChange,
  events,
  onTopicSelect,
  onTypeSelect,
  selectedTypes,
  eventTypes,
}: SearchDropdownProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extract unique topics from events
  const topics = useMemo(() => {
    const tagCounts = new Map<string, number>();
    events.forEach((event) => {
      event.tags?.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag, count]) => ({ name: tag, count }));
  }, [events]);

  // Extract time periods
  const timePeriods = useMemo(() => {
    const periodCounts = new Map<string, number>();
    events.forEach((event) => {
      const period = getTimePeriod(event.year);
      periodCounts.set(period, (periodCounts.get(period) || 0) + 1);
    });
    return Array.from(periodCounts.entries())
      .sort((a, b) => {
        // Sort chronologically
        const order = [
          "Ancient (Pre-3000 BCE)",
          "Ancient (3000-500 BCE)",
          "Classical Era",
          "Medieval Era",
          "Early Modern",
          "19th Century",
          "20th Century",
          "21st Century",
        ];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      })
      .map(([period, count]) => ({ name: period, count }));
  }, [events]);

  // Extract regions
  const regions = useMemo(() => {
    const regionCounts = new Map<string, number>();
    events.forEach((event) => {
      const region = getRegion(event.lat, event.lng);
      regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
    });
    return Array.from(regionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => count > 0)
      .map(([region, count]) => ({ name: region, count }));
  }, [events]);

  // Get type counts
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((event) => {
      counts.set(event.type, (counts.get(event.type) || 0) + 1);
    });
    return counts;
  }, [events]);

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const query = searchQuery.toLowerCase();
    return topics.filter((t) => t.name.toLowerCase().includes(query));
  }, [topics, searchQuery]);

  // Filter time periods based on search query
  const filteredPeriods = useMemo(() => {
    if (!searchQuery.trim()) return timePeriods;
    const query = searchQuery.toLowerCase();
    return timePeriods.filter((p) => p.name.toLowerCase().includes(query));
  }, [timePeriods, searchQuery]);

  // Filter regions based on search query
  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return regions;
    const query = searchQuery.toLowerCase();
    return regions.filter((r) => r.name.toLowerCase().includes(query));
  }, [regions, searchQuery]);

  // Filter event types based on search query
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return eventTypes;
    const query = searchQuery.toLowerCase();
    return eventTypes.filter((t) => t.label.toLowerCase().includes(query));
  }, [eventTypes, searchQuery]);

  // Matching events for search suggestions
  const matchingEvents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return events
      .filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query)
      )
      .slice(0, 5);
  }, [events, searchQuery]);

  const showDropdown = isFocused;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasResults =
    filteredTopics.length > 0 ||
    filteredPeriods.length > 0 ||
    filteredRegions.length > 0 ||
    filteredTypes.length > 0 ||
    matchingEvents.length > 0;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search events, topics, regions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="w-full bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => {
              onSearchChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {!hasSearchQuery ? (
            // Show all categories when not searching
            <div className="p-3 space-y-4">
              {/* Event Types */}
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                  <Tag className="w-3 h-3" />
                  <span>Event Types</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {eventTypes.map((type) => {
                    const count = typeCounts.get(type.id) || 0;
                    const isSelected = selectedTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          onTypeSelect(type.id);
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
                          isSelected
                            ? "bg-gray-800 text-white"
                            : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <span>{type.label}</span>
                        <span className="text-gray-500">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Periods */}
              {timePeriods.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <Clock className="w-3 h-3" />
                    <span>Time Periods</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {timePeriods.map((period) => (
                      <button
                        key={period.name}
                        onClick={() => {
                          onTopicSelect(period.name);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 hover:bg-gray-800 rounded-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <span>{period.name}</span>
                        <span className="text-gray-500">({period.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Regions */}
              {regions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <MapPin className="w-3 h-3" />
                    <span>Regions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {regions.map((region) => (
                      <button
                        key={region.name}
                        onClick={() => {
                          onTopicSelect(region.name);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 hover:bg-gray-800 rounded-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <span>{region.name}</span>
                        <span className="text-gray-500">({region.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Topics */}
              {topics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Popular Topics</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.slice(0, 10).map((topic) => (
                      <button
                        key={topic.name}
                        onClick={() => {
                          onSearchChange(topic.name);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-full text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <span>{topic.name}</span>
                        <span className="text-purple-500/60">({topic.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Show filtered results when searching
            <div className="p-3 space-y-4">
              {/* Matching Events */}
              {matchingEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <Folder className="w-3 h-3" />
                    <span>Events</span>
                  </div>
                  <div className="space-y-1">
                    {matchingEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => {
                          onSearchChange(event.title);
                          setIsFocused(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <p className="text-sm text-white truncate">{event.title}</p>
                        <p className="text-xs text-gray-500">
                          {event.year < 0
                            ? `${Math.abs(event.year)} BCE`
                            : event.year}{" "}
                          {event.locationName && `• ${event.locationName}`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Types */}
              {filteredTypes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <Tag className="w-3 h-3" />
                    <span>Related Types</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredTypes.map((type) => {
                      const count = typeCounts.get(type.id) || 0;
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            onTypeSelect(type.id);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 hover:bg-gray-800 rounded-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: type.color }}
                          />
                          <span>{type.label}</span>
                          <span className="text-gray-500">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching Time Periods */}
              {filteredPeriods.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <Clock className="w-3 h-3" />
                    <span>Related Periods</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredPeriods.map((period) => (
                      <button
                        key={period.name}
                        onClick={() => {
                          onTopicSelect(period.name);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 hover:bg-gray-800 rounded-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <span>{period.name}</span>
                        <span className="text-gray-500">({period.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Regions */}
              {filteredRegions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <MapPin className="w-3 h-3" />
                    <span>Related Regions</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredRegions.map((region) => (
                      <button
                        key={region.name}
                        onClick={() => {
                          onTopicSelect(region.name);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-800/50 hover:bg-gray-800 rounded-full text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <span>{region.name}</span>
                        <span className="text-gray-500">({region.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Topics */}
              {filteredTopics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Related Topics</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {filteredTopics.map((topic) => (
                      <button
                        key={topic.name}
                        onClick={() => {
                          onSearchChange(topic.name);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-full text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <span>{topic.name}</span>
                        <span className="text-purple-500/60">({topic.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {!hasResults && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No matching topics or events found
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
