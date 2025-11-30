import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Geocode tool - converts location names to coordinates
 */
export const geocodeTool = {
  description: "Convert a location name (city, country, landmark) into geographic coordinates (latitude, longitude). Always use this before creating an event.",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The name of the location to geocode (e.g., 'Rome, Italy' or 'Battle of Hastings, England')"
      }
    },
    required: ["location"]
  },
  execute: async (args: { location: string }) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
        q: args.location,
        format: 'json',
        limit: '3',
        addressdetails: '1',
      });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WorldTrue Historical Events App',
        },
      });

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return {
          success: false,
          message: `Could not find coordinates for "${args.location}". Try being more specific.`,
          results: [],
        };
      }

      const results = data.map((item: any) => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type,
      }));

      return {
        success: true,
        message: `Found ${results.length} location(s) for "${args.location}"`,
        results,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Geocoding error: ${error.message}`,
        results: [],
      };
    }
  },
};

/**
 * Create event tool - adds historical events to the database
 */
export const createEventTool = {
  description: "Create a new historical event in the database. Use the latitude and longitude from geocoding results.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Short descriptive title (3-8 words)"
      },
      description: {
        type: "string",
        description: "Detailed description (2-3 sentences with historical context)"
      },
      year: {
        type: "number",
        description: "Year the event occurred (negative for BCE, e.g., -44 for 44 BCE)"
      },
      month: {
        type: "number",
        description: "Month (1-12) if known"
      },
      day: {
        type: "number",
        description: "Day of month (1-31) if known"
      },
      latitude: {
        type: "number",
        description: "Latitude from geocoding result"
      },
      longitude: {
        type: "number",
        description: "Longitude from geocoding result"
      },
      locationName: {
        type: "string",
        description: "Human-readable location name (e.g., 'Rome, Italy')"
      },
      eventType: {
        type: "string",
        enum: ["conflict", "discovery", "cultural", "political", "technological"],
        description: "Type: conflict (wars), discovery (explorations), cultural (art), political (treaties), technological (inventions)"
      }
    },
    required: ["title", "description", "year", "latitude", "longitude", "locationName", "eventType"]
  },
  execute: async (args: {
    title: string;
    description: string;
    year: number;
    month?: number;
    day?: number;
    latitude: number;
    longitude: number;
    locationName: string;
    eventType: "conflict" | "discovery" | "cultural" | "political" | "technological";
  }) => {
    try {
      // Determine date precision
      let datePrecision: "day" | "month" | "year" = "year";
      if (args.day && args.month) {
        datePrecision = "day";
      } else if (args.month) {
        datePrecision = "month";
      }

      // Format date display string
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      let dateDisplay = args.year.toString();
      if (args.month) {
        dateDisplay = `${months[args.month - 1]} ${args.year}`;
        if (args.day) {
          dateDisplay = `${months[args.month - 1]} ${args.day}, ${args.year}`;
        }
      }

      // Map eventType to tag
      const tag = args.eventType.charAt(0).toUpperCase() + args.eventType.slice(1);

      // Insert using raw SQL to match actual database schema
      const result = await db.execute(sql`
        INSERT INTO events (
          id, title, description, date_year, date_month, date_day,
          date_display, date_precision, location_name, location_coordinates,
          tags, created_at, created_by
        ) VALUES (
          gen_random_uuid(),
          ${args.title},
          ${args.description},
          ${args.year},
          ${args.month || null},
          ${args.day || null},
          ${dateDisplay},
          ${datePrecision},
          ${args.locationName},
          ST_SetSRID(ST_MakePoint(${args.longitude}, ${args.latitude}), 4326)::geography,
          ARRAY[${tag}]::varchar[],
          NOW(),
          'ai-agent'
        )
        RETURNING id, title, date_year as year,
          ST_Y(location_coordinates::geometry) as lat,
          ST_X(location_coordinates::geometry) as lng
      `);

      const newEvent = (result.rows as any[])[0];

      return {
        success: true,
        message: `Created event: "${args.title}" (${args.year})`,
        event: {
          id: newEvent.id,
          title: newEvent.title,
          year: newEvent.year,
          latitude: parseFloat(newEvent.lat),
          longitude: parseFloat(newEvent.lng),
          eventType: args.eventType,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create event: ${error.message}`,
        event: null,
      };
    }
  },
};
