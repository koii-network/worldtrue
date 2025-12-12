"use client";

import { useState } from "react";
import { X, ExternalLink, MapPin, Calendar, Tag, Share2, Check, Copy } from "lucide-react";
import CommentsSection from "./CommentsSection";

interface MapEvent {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  year: number;
  type:
    | "conflict"
    | "discovery"
    | "cultural"
    | "political"
    | "technological"
    | "news"
    | "breaking"
    | "world"
    | "business"
    | "tech"
    | "sports";
  source?: string;
  sourceUrl?: string;
  imageUrl?: string;
  timestamp?: string;
  country?: string;
  sentiment?: "positive" | "negative" | "neutral";
  locationName?: string;
}

interface EventDetailPanelProps {
  event: MapEvent | null;
  onClose: () => void;
}

const typeColors: Record<string, string> = {
  conflict: "#ef4444",
  discovery: "#3b82f6",
  cultural: "#a855f7",
  political: "#f59e0b",
  technological: "#10b981",
  news: "#6366f1",
  breaking: "#dc2626",
  world: "#0ea5e9",
  business: "#84cc16",
  tech: "#06b6d4",
  sports: "#f97316",
};

const typeLabels: Record<string, string> = {
  conflict: "Conflict",
  discovery: "Discovery",
  cultural: "Cultural",
  political: "Political",
  technological: "Technology",
  news: "News",
  breaking: "Breaking",
  world: "World",
  business: "Business",
  tech: "Tech",
  sports: "Sports",
};

function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

function getWikipediaUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
    title
  )}&go=Go`;
}

export default function EventDetailPanel({
  event,
  onClose,
}: EventDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const color = typeColors[event.type] || "#6b7280";

  const handleShare = async () => {
    const url = `${window.location.origin}/event/${event.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-6 md:right-6 md:left-auto md:top-auto z-50 animate-slide-up md:animate-none">
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-t-2xl md:rounded-xl shadow-2xl w-full md:w-96 max-h-[80vh] md:max-h-[70vh] flex flex-col overflow-hidden">
          {/* Header with close button */}
          <div className="flex items-start justify-between p-4 border-b border-gray-800">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}
                >
                  {typeLabels[event.type] || event.type}
                </span>
                {event.sentiment && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      event.sentiment === "positive"
                        ? "bg-green-500"
                        : event.sentiment === "negative"
                        ? "bg-red-500"
                        : "bg-gray-500"
                    }`}
                    title={`Sentiment: ${event.sentiment}`}
                  />
                )}
              </div>
              <h2 className="text-lg font-semibold text-white leading-tight">
                {event.title}
              </h2>
            </div>
            <button
              onClick={handleShare}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              title="Copy share link"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Image (if news) */}
            {event.imageUrl && (
              <div className="relative h-40 overflow-hidden">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
              </div>
            )}

            {/* Event metadata */}
            <div className="p-4 space-y-3">
              {/* Date/Year */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-300">
                  {event.timestamp
                    ? new Date(event.timestamp).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : formatYear(event.year)}
                </span>
              </div>

              {/* Location */}
              {(event.locationName || event.country) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">
                    {event.locationName || event.country}
                  </span>
                </div>
              )}

              {/* Source (for news) */}
              {event.source && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300">{event.source}</span>
                </div>
              )}

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed">
                {event.description}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                {event.sourceUrl ? (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Read Article
                  </a>
                ) : (
                  <a
                    href={getWikipediaUrl(event.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Wikipedia
                  </a>
                )}
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Share
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <CommentsSection eventId={event.id} eventTitle={event.title} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
