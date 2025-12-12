"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Globe, Search, Filter, X, Plus, MessageSquare, Loader2 } from "lucide-react";
import EventModal, { EventFormData } from "@/components/EventModal";
import AuthButton from "@/components/AuthButton";
import ChatPanel from "@/components/ChatPanel";
import EventListPopover from "@/components/EventListPopover";
import EventDetailPanel from "@/components/EventDetailPanel";
import SearchDropdown from "@/components/SearchDropdown";
import MobileNav from "@/components/MobileNav";
import MobileSearch from "@/components/MobileSearch";
import type { SuggestedEventWithSource } from "@/components/Map";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-950">
      <div className="flex items-center gap-3 text-gray-400">
        <Globe className="w-6 h-6 animate-pulse" />
        <span>Loading map...</span>
      </div>
    </div>
  ),
});

interface MapEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  year: number;
  type: "conflict" | "discovery" | "cultural" | "political" | "technological" | "news" | "breaking" | "world" | "business" | "tech" | "sports";
  // News-specific fields
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  timestamp?: string;
  country?: string;
  sentiment?: "positive" | "negative" | "neutral";
}

// Sample events as fallback
const sampleEvents: MapEvent[] = [
  { id: "1", year: -3000, title: "Great Pyramid of Giza", description: "Construction begins on one of the Seven Wonders of the Ancient World.", lat: 29.9792, lng: 31.1342, type: "cultural" },
  { id: "2", year: -753, title: "Founding of Rome", description: "According to legend, Rome is founded by Romulus.", lat: 41.9028, lng: 12.4964, type: "political" },
  { id: "3", year: -490, title: "Battle of Marathon", description: "Greeks defeat Persian invasion.", lat: 38.1489, lng: 23.9682, type: "conflict" },
  { id: "4", year: 79, title: "Eruption of Vesuvius", description: "Mount Vesuvius erupts, burying Pompeii.", lat: 40.8218, lng: 14.4264, type: "discovery" },
  { id: "5", year: 1066, title: "Battle of Hastings", description: "William the Conqueror defeats Harold II.", lat: 50.9115, lng: 0.4874, type: "conflict" },
  { id: "6", year: 1215, title: "Magna Carta", description: "King John signs the Magna Carta.", lat: 51.4116, lng: -0.5906, type: "political" },
  { id: "7", year: 1492, title: "Columbus Reaches Americas", description: "Christopher Columbus lands in the Caribbean.", lat: 25.0343, lng: -77.3963, type: "discovery" },
  { id: "8", year: 1776, title: "Declaration of Independence", description: "American colonies declare independence.", lat: 39.9496, lng: -75.1503, type: "political" },
  { id: "9", year: 1789, title: "French Revolution", description: "Storming of the Bastille marks the revolution's start.", lat: 48.8566, lng: 2.3522, type: "political" },
  { id: "10", year: 1969, title: "Moon Landing", description: "Apollo 11 lands the first humans on the Moon.", lat: 28.5383, lng: -80.6054, type: "technological" },
  { id: "11", year: 1989, title: "Fall of Berlin Wall", description: "The Berlin Wall falls, symbolizing end of Cold War.", lat: 52.5163, lng: 13.3777, type: "political" },
  // China's Century of Humiliation - British Opium Trade
  { id: "12", year: 1773, title: "British East India Company Opium Monopoly", description: "The EIC establishes monopoly over Bengal opium production, systematically cultivating and exporting opium to China despite Qing prohibition, creating widespread addiction.", lat: 25.5941, lng: 85.1376, type: "political" },
  { id: "13", year: 1839, title: "Lin Zexu Destroys Opium at Humen", description: "Imperial Commissioner Lin Zexu publicly destroys 1.2 million kg of confiscated British opium over 23 days, triggering diplomatic crisis and eventual war with Britain.", lat: 22.8167, lng: 113.6667, type: "political" },
  { id: "14", year: 1839, title: "First Opium War Begins", description: "Britain declares war on Qing China after Commissioner Lin Zexu destroys British opium in Canton. The war would force China to open ports to British trade and cede Hong Kong.", lat: 23.1291, lng: 113.2644, type: "conflict" },
  { id: "15", year: 1842, title: "Treaty of Nanking", description: "First of the 'unequal treaties' ending the First Opium War. China cedes Hong Kong to Britain, opens five treaty ports, and pays 21 million silver dollars in reparations.", lat: 32.0603, lng: 118.7969, type: "political" },
  { id: "16", year: 1850, title: "Taiping Rebellion Begins", description: "Hong Xiuquan leads a massive uprising against the Qing dynasty, partly fueled by social instability from opium addiction and foreign incursions. Would claim 20-30 million lives.", lat: 24.4803, lng: 118.0894, type: "conflict" },
  { id: "17", year: 1856, title: "Second Opium War Begins", description: "Britain and France attack China after the Arrow Incident. The war would result in further concessions, legalization of opium trade, and opening of additional ports.", lat: 23.1291, lng: 113.2644, type: "conflict" },
  { id: "18", year: 1858, title: "Treaty of Tientsin", description: "Unequal treaty opening 10 more Chinese ports to Western trade, legalizing the opium trade, permitting foreign ships on the Yangtze, and allowing Christian missionaries into China.", lat: 39.0842, lng: 117.2009, type: "political" },
  { id: "19", year: 1860, title: "Burning of the Old Summer Palace", description: "British and French troops loot and destroy the Yuanmingyuan (Old Summer Palace) in retaliation for the torture of diplomats. One of the most devastating cultural losses in Chinese history.", lat: 40.0089, lng: 116.2983, type: "conflict" },
  { id: "20", year: 1860, title: "Convention of Peking", description: "Treaty ending Second Opium War. China cedes Kowloon Peninsula to Britain, opens Tianjin as treaty port, legalizes opium trade, and allows foreign missionaries throughout China.", lat: 39.9042, lng: 116.4074, type: "political" },
  { id: "21", year: 1900, title: "Boxer Rebellion", description: "Anti-foreign, anti-Christian uprising by the 'Righteous Harmony Society.' Eight-nation alliance including Britain crushes the rebellion, leading to further indemnities and humiliation.", lat: 39.9042, lng: 116.4074, type: "conflict" },
];

const eventTypes = [
  // Historical event types
  { id: "conflict", label: "Conflict", color: "#ef4444" },
  { id: "discovery", label: "Discovery", color: "#3b82f6" },
  { id: "cultural", label: "Cultural", color: "#a855f7" },
  { id: "political", label: "Political", color: "#f59e0b" },
  { id: "technological", label: "Technology", color: "#10b981" },
  // News types
  { id: "breaking", label: "Breaking", color: "#dc2626" },
  { id: "world", label: "World", color: "#0ea5e9" },
  { id: "business", label: "Business", color: "#84cc16" },
  { id: "tech", label: "Tech", color: "#06b6d4" },
  { id: "sports", label: "Sports", color: "#f97316" },
];

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(eventTypes.map((t) => t.id));
  const [showFilters, setShowFilters] = useState(false);

  // Event data state
  const [events, setEvents] = useState<MapEvent[]>(sampleEvents);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Chat state
  const [showChat, setShowChat] = useState(false);

  // Mobile search state
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Events list popover state
  const [showEventsList, setShowEventsList] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  // Pending/queued events from "Find Similar" searches
  const [pendingEvents, setPendingEvents] = useState<SuggestedEventWithSource[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  // Selected event for detail panel
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);

  // API key for map hover features
  const [apiKey, setApiKey] = useState("");

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("gemini-api-key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events");
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setEvents(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle URL parameter for event deep linking
  useEffect(() => {
    const eventId = searchParams.get("event");
    if (eventId && events.length > 0 && !isLoading) {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setHighlightedEventId(eventId);
      }
    }
  }, [searchParams, events, isLoading]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType = selectedTypes.includes(event.type);
      const matchesSearch =
        searchQuery === "" ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [events, selectedTypes, searchQuery]);

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleAddEvent = () => {
    setShowEventModal(true);
  };

  const handleRequestLocation = () => {
    setSelectingLocation(true);
    setShowEventModal(false);
  };

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setPendingLocation(location);
    setSelectingLocation(false);
    setShowEventModal(true);
  };

  const handleSubmitEvent = async (eventData: EventFormData) => {
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create event");
    }

    // Refresh events list
    await fetchEvents();
    setPendingLocation(null);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    if (!selectingLocation) {
      setPendingLocation(null);
    }
  };

  // Handle new suggested events from map searches
  const handleSuggestedEventsFound = useCallback((newEvents: SuggestedEventWithSource[]) => {
    setPendingEvents(prev => {
      // Deduplicate by title
      const existingTitles = new Set(prev.map(e => e.title));
      const uniqueNew = newEvents.filter(e => !existingTitles.has(e.title));
      return [...prev, ...uniqueNew];
    });
  }, []);

  // Remove a pending event (when added to map or dismissed)
  const handleRemovePendingEvent = useCallback((title: string) => {
    setPendingEvents(prev => prev.filter(e => e.title !== title));
  }, []);

  // Handle event click - show detail panel and update URL
  const handleEventClick = useCallback((event: MapEvent) => {
    setSelectedEvent(event);
    setHighlightedEventId(event.id);
    // Update URL without full page reload
    const url = new URL(window.location.href);
    url.searchParams.set("event", event.id);
    window.history.pushState({}, "", url.toString());
  }, []);

  // Handle closing the detail panel
  const handleCloseDetailPanel = useCallback(() => {
    setSelectedEvent(null);
    setHighlightedEventId(null);
    // Clear the event from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("event");
    window.history.pushState({}, "", url.toString());
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-gray-950 relative">
      {/* Map */}
      <Map
        events={filteredEvents}
        onEventClick={handleEventClick}
        selectMode={selectingLocation}
        onLocationSelect={handleLocationSelect}
        pendingLocation={pendingLocation}
        apiKey={apiKey}
        onEventsCreated={fetchEvents}
        highlightedEventId={highlightedEventId}
        onSearchingChange={setIsSearchingSuggestions}
        onSuggestedEventsFound={handleSuggestedEventsFound}
      />

      {/* Location Selection Banner */}
      {selectingLocation && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
            <span className="text-sm font-medium">Click on the map to select a location</span>
            <button
              onClick={() => {
                setSelectingLocation(false);
                setShowEventModal(true);
              }}
              className="text-purple-200 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-800">
            <Globe className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-white">WorldTrue</span>
          </div>

          {/* Search - Desktop only */}
          <div className="hidden md:block flex-1 max-w-md">
            <SearchDropdown
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              events={events}
              onTopicSelect={(topic) => setSearchQuery(topic)}
              onTypeSelect={toggleType}
              selectedTypes={selectedTypes}
              eventTypes={eventTypes}
            />
          </div>

          {/* Desktop only controls */}
          <div className="hidden md:flex items-center gap-2">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                showFilters
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-gray-900/80 backdrop-blur-sm border-gray-800 text-gray-300 hover:border-gray-700"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {selectedTypes.length < eventTypes.length && (
                <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {selectedTypes.length}
                </span>
              )}
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
                showChat
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-gray-900/80 backdrop-blur-sm border-gray-800 text-gray-300 hover:border-gray-700"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">Ask AI</span>
            </button>
          </div>

          {/* Auth Button - Always visible */}
          <AuthButton />
        </div>

        {/* Filter Dropdown */}
        {showFilters && (
          <div className="max-w-7xl mx-auto mt-2 flex justify-end">
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl p-4 shadow-xl">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                Event Types
              </div>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => toggleType(type.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedTypes.includes(type.id)
                        ? "bg-gray-800 text-white"
                        : "bg-gray-900 text-gray-500 hover:text-gray-400"
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
          </div>
        )}
      </header>

      {/* Add Event Button - Desktop only */}
      <div className="absolute bottom-20 left-6 z-10 hidden md:block">
        <button
          onClick={handleAddEvent}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full shadow-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add Event</span>
        </button>
      </div>

      {/* Event Count - Clickable to show popover - Desktop only */}
      {!showEventsList && (
        <div className="absolute bottom-6 left-6 z-10 hidden md:block">
          <button
            onClick={() => setShowEventsList(true)}
            className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-full px-4 py-2 text-sm text-gray-400 hover:border-gray-700 hover:bg-gray-900/90 transition-colors cursor-pointer flex items-center gap-2"
          >
            {isSearchingSuggestions ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
            ) : null}
            <span>
              <span className="text-white font-medium">{filteredEvents.length}</span> events
            </span>
            {pendingEvents.length > 0 && (
              <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                +{pendingEvents.length}
              </span>
            )}
            {isLoading && <span className="text-gray-500">(loading...)</span>}
          </button>
        </div>
      )}

      {/* Events List Popover */}
      <EventListPopover
        isOpen={showEventsList}
        onClose={() => {
          setShowEventsList(false);
          setHighlightedEventId(null);
        }}
        events={filteredEvents}
        onEventHover={setHighlightedEventId}
        onEventClick={handleEventClick}
        apiKey={apiKey}
        onEventsCreated={fetchEvents}
        pendingEvents={pendingEvents}
        onRemovePendingEvent={handleRemovePendingEvent}
        isSearching={isSearchingSuggestions}
      />

      {/* Legend - Desktop only */}
      <div className="absolute bottom-6 right-20 z-10 hidden md:block">
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-xl p-3">
          <div className="flex gap-4">
            {eventTypes
              .filter((t) => selectedTypes.includes(t.id))
              .map((type) => (
                <div key={type.id} className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-xs text-gray-400">{type.label}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitEvent}
        selectedLocation={pendingLocation}
        onRequestLocation={handleRequestLocation}
      />

      {/* Chat Panel */}
      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        onEventsCreated={fetchEvents}
        events={filteredEvents}
      />

      {/* Mobile Navigation */}
      <MobileNav
        onSearchClick={() => setShowMobileSearch(true)}
        onAIClick={() => setShowChat(true)}
        onAddClick={handleAddEvent}
        isAIOpen={showChat}
      />

      {/* Mobile Search Overlay */}
      <MobileSearch
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTypes={selectedTypes}
        onTypeToggle={toggleType}
        eventTypes={eventTypes}
      />

      {/* Event Detail Panel with Comments */}
      <EventDetailPanel
        event={selectedEvent}
        onClose={handleCloseDetailPanel}
      />
    </main>
  );
}

// Main export with Suspense boundary for useSearchParams
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-gray-950">
          <div className="flex items-center gap-3 text-gray-400">
            <Globe className="w-6 h-6 animate-pulse" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
