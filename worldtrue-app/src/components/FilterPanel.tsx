"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import {
  EventCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  FilterState,
} from "@/types";

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  minYear: number;
  maxYear: number;
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  minYear,
  maxYear,
}: FilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const categories: EventCategory[] = Object.keys(
    CATEGORY_LABELS
  ) as EventCategory[];

  const handleYearChange = (index: number, value: number) => {
    const newRange: [number, number] = [...filters.yearRange];
    newRange[index] = value;
    onFiltersChange({ ...filters, yearRange: newRange });
  };

  const handleCategoryToggle = (category: EventCategory) => {
    const newCategories = filters.selectedCategories.includes(category)
      ? filters.selectedCategories.filter((c) => c !== category)
      : [...filters.selectedCategories, category];

    onFiltersChange({ ...filters, selectedCategories: newCategories });
  };

  const handleSelectAll = () => {
    onFiltersChange({ ...filters, selectedCategories: categories });
  };

  const handleClearAll = () => {
    onFiltersChange({ ...filters, selectedCategories: [] });
  };

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-700 transition-all duration-300 z-10 ${
        isCollapsed ? "w-12" : "w-80"
      }`}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full p-1.5 transition-colors"
        aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-300" />
        )}
      </button>

      {/* Collapsed View */}
      {isCollapsed && (
        <div className="flex flex-col items-center pt-6 space-y-4">
          <Filter className="w-6 h-6 text-gray-400" />
          <div className="text-xs text-gray-500 writing-mode-vertical-rl transform rotate-180">
            Filters
          </div>
        </div>
      )}

      {/* Expanded View */}
      {!isCollapsed && (
        <div className="h-full flex flex-col p-6 overflow-hidden">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Explore history through time and category
            </p>
          </div>

          {/* Year Range Filter */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">
              Year Range
            </h3>
            <div className="space-y-4">
              {/* From Year */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  From: {filters.yearRange[0]}
                </label>
                <input
                  type="range"
                  min={minYear}
                  max={filters.yearRange[1]}
                  value={filters.yearRange[0]}
                  onChange={(e) =>
                    handleYearChange(0, parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* To Year */}
              <div>
                <label className="text-xs text-gray-400 block mb-2">
                  To: {filters.yearRange[1]}
                </label>
                <input
                  type="range"
                  min={filters.yearRange[0]}
                  max={maxYear}
                  value={filters.yearRange[1]}
                  onChange={(e) =>
                    handleYearChange(1, parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Year Range Display */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{minYear}</span>
                <span className="text-purple-400 font-semibold">
                  {filters.yearRange[1] - filters.yearRange[0]} years
                </span>
                <span>{maxYear}</span>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                Categories
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  All
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  None
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {categories.map((category) => {
                const isSelected =
                  filters.selectedCategories.includes(category);
                return (
                  <label
                    key={category}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "bg-gray-800 border border-gray-600"
                        : "hover:bg-gray-800/50 border border-transparent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCategoryToggle(category)}
                      className="w-4 h-4 rounded accent-purple-600 cursor-pointer"
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    />
                    <span className="text-sm text-gray-200 flex-1">
                      {CATEGORY_LABELS[category]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Stats */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs text-gray-500">
              <div className="flex justify-between mb-1">
                <span>Active filters:</span>
                <span className="text-purple-400 font-semibold">
                  {filters.selectedCategories.length} / {categories.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
