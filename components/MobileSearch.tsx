"use client";

import { useEffect, useRef } from "react";
import { X, Search } from "lucide-react";

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
  eventTypes: Array<{ id: string; label: string; color: string }>;
}

export default function MobileSearch({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  selectedTypes,
  onTypeToggle,
  eventTypes,
}: MobileSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 md:hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Filter by Type
        </div>
        <div className="flex flex-wrap gap-2">
          {eventTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => onTypeToggle(type.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                selectedTypes.includes(type.id)
                  ? "bg-gray-800 text-white"
                  : "bg-gray-900 text-gray-500 border border-gray-800"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: selectedTypes.includes(type.id)
                    ? type.color
                    : "#4b5563",
                }}
              />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results hint */}
      <div className="px-4 py-2 text-sm text-gray-500">
        {searchQuery
          ? `Searching for "${searchQuery}"...`
          : "Type to search events"}
      </div>
    </div>
  );
}
