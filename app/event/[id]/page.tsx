import { redirect } from "next/navigation";
import { Metadata } from "next";
import { db } from "@/db";
import { sql } from "drizzle-orm";

interface Props {
  params: Promise<{ id: string }>;
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const result = await db.execute(sql`
      SELECT title, description, date_year as year, location_name
      FROM events
      WHERE id = ${id}::uuid
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return {
        title: "Event Not Found | WorldTrue",
        description: "This event could not be found.",
      };
    }

    const event = result.rows[0] as any;
    const year = event.year < 0 ? `${Math.abs(event.year)} BCE` : event.year;

    return {
      title: `${event.title} (${year}) | WorldTrue`,
      description: event.description?.slice(0, 160) || "Explore this historical event on WorldTrue.",
      openGraph: {
        title: `${event.title} (${year})`,
        description: event.description?.slice(0, 160) || "Explore this historical event on WorldTrue.",
        type: "article",
        siteName: "WorldTrue",
      },
      twitter: {
        card: "summary_large_image",
        title: `${event.title} (${year})`,
        description: event.description?.slice(0, 160) || "Explore this historical event on WorldTrue.",
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Event | WorldTrue",
      description: "Explore historical events on WorldTrue.",
    };
  }
}

// Redirect to main page with event parameter
export default async function EventPage({ params }: Props) {
  const { id } = await params;

  // Validate that the event exists before redirecting
  try {
    const result = await db.execute(sql`
      SELECT id FROM events WHERE id = ${id}::uuid LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Event not found - redirect to home
      redirect("/");
    }
  } catch (error) {
    // Invalid UUID or database error - redirect to home
    redirect("/");
  }

  // Redirect to main page with event parameter to open details
  redirect(`/?event=${id}`);
}
