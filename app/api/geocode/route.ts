import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { locationName } = await request.json();

    if (!locationName) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    // Use Nominatim geocoding API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: locationName,
          format: "json",
          limit: "5",
        }),
      {
        headers: {
          "User-Agent": "WorldTrue-HistoricalMap/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding request failed");
    }

    const results = await response.json();

    return NextResponse.json({
      success: true,
      results: results.map((result: any) => ({
        lat: result.lat,
        lon: result.lon,
        displayName: result.display_name,
        type: result.type,
        importance: result.importance,
      })),
    });
  } catch (error: any) {
    console.error("Geocode API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to geocode location" },
      { status: 500 }
    );
  }
}
