"use client";

import { useState } from "react";
import { X, MapPin, Calendar, Tag, Plus, Trash2, Loader2 } from "lucide-react";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: EventFormData) => Promise<void>;
  selectedLocation: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
}

export interface EventFormData {
  title: string;
  description: string;
  year: number;
  month?: number;
  day?: number;
  datePrecision: "day" | "month" | "year" | "decade" | "century";
  lat: number;
  lng: number;
  locationName?: string;
  eventType: "conflict" | "discovery" | "cultural" | "political" | "technological";
  metadata?: Record<string, string>;
}

const eventTypes = [
  { id: "conflict", label: "Conflict", color: "#ef4444" },
  { id: "discovery", label: "Discovery", color: "#3b82f6" },
  { id: "cultural", label: "Cultural", color: "#a855f7" },
  { id: "political", label: "Political", color: "#f59e0b" },
  { id: "technological", label: "Technology", color: "#10b981" },
] as const;

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const datePrecisions = [
  { id: "day", label: "Exact day" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "decade", label: "Decade" },
  { id: "century", label: "Century" },
] as const;

export default function EventModal({
  isOpen,
  onClose,
  onSubmit,
  selectedLocation,
  onRequestLocation,
}: EventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [day, setDay] = useState<string>("");
  const [datePrecision, setDatePrecision] = useState<EventFormData["datePrecision"]>("year");
  const [locationName, setLocationName] = useState("");
  const [eventType, setEventType] = useState<EventFormData["eventType"]>("cultural");
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setYear("");
    setMonth("");
    setDay("");
    setDatePrecision("year");
    setLocationName("");
    setEventType("cultural");
    setCustomFields([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: "key" | "value", value: string) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!year || isNaN(parseInt(year))) {
      setError("Valid year is required");
      return;
    }
    if (!selectedLocation) {
      setError("Please select a location on the map");
      return;
    }

    // Build metadata from custom fields
    const metadata: Record<string, string> = {};
    customFields.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) {
        metadata[key.trim()] = value.trim();
      }
    });

    const eventData: EventFormData = {
      title: title.trim(),
      description: description.trim(),
      year: parseInt(year),
      month: month ? parseInt(month) : undefined,
      day: day ? parseInt(day) : undefined,
      datePrecision,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      locationName: locationName.trim() || undefined,
      eventType,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(eventData);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatYear = (y: string) => {
    const num = parseInt(y);
    if (isNaN(num)) return "";
    return num < 0 ? `${Math.abs(num)} BCE` : `${num} CE`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Historical Event</h2>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Battle of Thermopylae"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Event Type
            </label>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setEventType(type.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                    eventType === type.id
                      ? "bg-gray-700 text-white ring-2 ring-purple-500"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Section */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">
              <Calendar className="w-4 h-4 inline mr-1" />
              When did this happen?
            </label>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Year *</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="-490"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                {year && (
                  <div className="text-xs text-gray-500 mt-1">{formatYear(year)}</div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">--</option>
                  {months.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m.slice(0, 3)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Day</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">--</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Date Precision</label>
              <select
                value={datePrecision}
                onChange={(e) => setDatePrecision(e.target.value as EventFormData["datePrecision"])}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                {datePrecisions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Section */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location *
            </label>

            {selectedLocation ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                  </span>
                  <button
                    type="button"
                    onClick={onRequestLocation}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Change
                  </button>
                </div>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Location name (e.g., Athens, Greece)"
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={onRequestLocation}
                className="w-full p-4 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-colors"
              >
                <MapPin className="w-5 h-5 mx-auto mb-1" />
                Click to select location on map
              </button>
            )}
          </div>

          {/* Custom Metadata */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                Custom Fields
              </label>
              <button
                type="button"
                onClick={addCustomField}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
              >
                <Plus className="w-3 h-3" />
                Add field
              </button>
            </div>

            {customFields.length > 0 ? (
              <div className="space-y-2">
                {customFields.map((field, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={field.key}
                      onChange={(e) => updateCustomField(index, "key", e.target.value)}
                      placeholder="Key"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(index, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(index)}
                      className="p-2 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Add custom key-value pairs (e.g., source, tags, related events)
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Add Event"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
