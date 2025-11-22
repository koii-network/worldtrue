"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import FilterPanel from "@/components/FilterPanel";
import { FilterState, EventCategory, CATEGORY_LABELS } from "@/types";
import { sampleEvents } from "@/data/sampleEvents";
import { Globe } from "lucide-react";

// Dynamically import WorldMap to avoid SSR issues with Leaflet
const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <Globe className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-400 text-lg">Loading world map...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  // Calculate min/max years from events
  const minYear = useMemo(
    () => Math.min(...sampleEvents.map((e) => e.year)),
    []
  );
  const maxYear = useMemo(
    () => Math.max(...sampleEvents.map((e) => e.year)),
    []
  );

  // Initialize filters with all categories selected
  const allCategories: EventCategory[] = Object.keys(
    CATEGORY_LABELS
  ) as EventCategory[];

  const [filters, setFilters] = useState<FilterState>({
    yearRange: [minYear, maxYear],
    selectedCategories: allCategories,
  });

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    return sampleEvents.filter((event) => {
      // Check year range
      const inYearRange =
        event.year >= filters.yearRange[0] &&
        event.year <= filters.yearRange[1];

      // Check if any of the event's categories are selected
      const hasSelectedCategory =
        filters.selectedCategories.length === 0 || // If no categories selected, show all
        event.categories.some((cat) =>
          filters.selectedCategories.includes(cat)
        );

      return inYearRange && hasSelectedCategory;
    });
  }, [filters]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        minYear={minYear}
        maxYear={maxYear}
      />

      {/* Map Container */}
      <div className="w-full h-full">
        <WorldMap events={sampleEvents} filteredEvents={filteredEvents} />
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-20 pt-6">
        <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-6 py-3 shadow-2xl">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe className="w-7 h-7 text-purple-500" />
            WorldTrue
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Mapping humanity's collective story
          </p>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute bottom-6 right-6 z-20">
        <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-5 py-3 shadow-2xl">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-purple-400">
              {filteredEvents.length}
            </span>
            <span className="text-sm text-gray-400">
              / {sampleEvents.length} events
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {filters.yearRange[0]} to {filters.yearRange[1]}
          </p>
        </div>
      </div>

      {/* Legend - Show when categories are filtered */}
      {filters.selectedCategories.length > 0 &&
        filters.selectedCategories.length < allCategories.length && (
          <div className="absolute bottom-6 left-20 z-20 max-w-xs">
            <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-3 shadow-2xl">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Active Filters
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {filters.selectedCategories.map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-600"
                  >
                    {CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
    </main>
  );
}
