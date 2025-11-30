import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, userSettings } from "@/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Simple XOR encryption for API key (not military grade, but obscures the key in DB)
// In production, use a proper encryption library like crypto-js with a secret key
function encryptKey(key: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || "worldtrue-secret";
  let encrypted = "";
  for (let i = 0; i < key.length; i++) {
    encrypted += String.fromCharCode(
      key.charCodeAt(i) ^ secret.charCodeAt(i % secret.length)
    );
  }
  return Buffer.from(encrypted).toString("base64");
}

function decryptKey(encrypted: string): string {
  const secret = process.env.BETTER_AUTH_SECRET || "worldtrue-secret";
  const decoded = Buffer.from(encrypted, "base64").toString();
  let decrypted = "";
  for (let i = 0; i < decoded.length; i++) {
    decrypted += String.fromCharCode(
      decoded.charCodeAt(i) ^ secret.charCodeAt(i % secret.length)
    );
  }
  return decrypted;
}

// GET - Retrieve user settings (API key)
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    if (settings.length === 0 || !settings[0].geminiApiKey) {
      return NextResponse.json({ geminiApiKey: null });
    }

    // Decrypt the API key before returning
    const decryptedKey = decryptKey(settings[0].geminiApiKey);
    return NextResponse.json({ geminiApiKey: decryptedKey });
  } catch (error: any) {
    console.error("Failed to get settings:", error);
    return NextResponse.json(
      { error: "Failed to retrieve settings" },
      { status: 500 }
    );
  }
}

// POST - Save user settings (API key)
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { geminiApiKey } = await request.json();

    // Encrypt the API key before storing
    const encryptedKey = geminiApiKey ? encryptKey(geminiApiKey) : null;

    // Check if settings already exist
    const existing = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, session.user.id))
      .limit(1);

    if (existing.length > 0) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          geminiApiKey: encryptedKey,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, session.user.id));
    } else {
      // Create new settings
      await db.insert(userSettings).values({
        id: randomUUID(),
        userId: session.user.id,
        geminiApiKey: encryptedKey,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

// DELETE - Clear user API key
export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(userSettings)
      .set({
        geminiApiKey: null,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to clear settings:", error);
    return NextResponse.json(
      { error: "Failed to clear settings" },
      { status: 500 }
    );
  }
}
