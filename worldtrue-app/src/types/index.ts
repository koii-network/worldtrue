export type EventCategory =
  | "military"
  | "cultural"
  | "cuisine"
  | "architecture"
  | "trade"
  | "religion"
  | "science"
  | "art"
  | "literature"
  | "music"
  | "philosophy"
  | "technology"
  | "exploration"
  | "governance"
  | "economy"
  | "agriculture"
  | "medicine"
  | "education"
  | "sports"
  | "festival";

export interface HistoricalEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  lat: number;
  lng: number;
  categories: EventCategory[];
  primaryCategory: EventCategory;
  importance: number; // 1-10 scale for marker sizing
}

export interface FilterState {
  yearRange: [number, number];
  selectedCategories: EventCategory[];
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  military: "#ef4444", // red
  cultural: "#a855f7", // purple
  cuisine: "#f59e0b", // orange
  architecture: "#06b6d4", // cyan
  trade: "#10b981", // green
  religion: "#8b5cf6", // violet
  science: "#3b82f6", // blue
  art: "#ec4899", // pink
  literature: "#6366f1", // indigo
  music: "#f97316", // orange-red
  philosophy: "#14b8a6", // teal
  technology: "#22c55e", // green-light
  exploration: "#0ea5e9", // sky
  governance: "#eab308", // yellow
  economy: "#84cc16", // lime
  agriculture: "#65a30d", // green-dark
  medicine: "#dc2626", // red-dark
  education: "#7c3aed", // purple-dark
  sports: "#db2777", // pink-dark
  festival: "#f472b6", // pink-light
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  military: "Military & Warfare",
  cultural: "Cultural Events",
  cuisine: "Cuisine & Food",
  architecture: "Architecture",
  trade: "Trade & Commerce",
  religion: "Religion & Spirituality",
  science: "Science & Discovery",
  art: "Visual Arts",
  literature: "Literature & Writing",
  music: "Music & Performance",
  philosophy: "Philosophy",
  technology: "Technology",
  exploration: "Exploration",
  governance: "Governance & Politics",
  economy: "Economics",
  agriculture: "Agriculture",
  medicine: "Medicine & Health",
  education: "Education",
  sports: "Sports & Games",
  festival: "Festivals & Celebrations",
};
