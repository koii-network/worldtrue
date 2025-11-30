"use client";

import { Search, List, Sparkles, Plus } from "lucide-react";

interface MobileNavProps {
  onSearchClick: () => void;
  onEventsClick: () => void;
  onAIClick: () => void;
  onAddClick: () => void;
  eventCount: number;
  pendingCount: number;
  isAIOpen: boolean;
  isEventsOpen: boolean;
}

export default function MobileNav({
  onSearchClick,
  onEventsClick,
  onAIClick,
  onAddClick,
  eventCount,
  pendingCount,
  isAIOpen,
  isEventsOpen,
}: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16">
        {/* Search */}
        <button
          onClick={onSearchClick}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <Search className="w-5 h-5" />
          <span className="text-xs">Search</span>
        </button>

        {/* Events */}
        <button
          onClick={onEventsClick}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors relative ${
            isEventsOpen ? "text-purple-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <div className="relative">
            <List className="w-5 h-5" />
            {(eventCount > 0 || pendingCount > 0) && (
              <span className="absolute -top-1.5 -right-2 bg-purple-500 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-medium">
                {eventCount}
                {pendingCount > 0 && <span className="text-purple-200">+</span>}
              </span>
            )}
          </div>
          <span className="text-xs">Events</span>
        </button>

        {/* AI Assistant */}
        <button
          onClick={onAIClick}
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
            isAIOpen ? "text-purple-400" : "text-gray-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-xs">AI</span>
        </button>

        {/* Add Event */}
        <button
          onClick={onAddClick}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </div>
        </button>
      </div>
    </nav>
  );
}
