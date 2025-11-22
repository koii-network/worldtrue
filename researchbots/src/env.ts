import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // NeonDB Configuration
    DATABASE_URL: z.string().url().describe("NeonDB PostgreSQL connection string"),

    // Google Cloud / Vertex AI Configuration
    GOOGLE_CLOUD_PROJECT: z.string().describe("Google Cloud project ID"),
    GOOGLE_CLOUD_LOCATION: z.string().default("us-central1").describe("Google Cloud region"),

    // Google Service Account Credentials (JSON string)
    GOOGLE_CREDENTIALS_JSON: z.string().describe("Service account JSON credentials as string"),

    // Optional: Alternative credential methods
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional().describe("Path to service account JSON file"),

    // Application settings
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Research bot specific settings
    MAX_SEARCH_RESULTS: z.string().transform(Number).default("20"),
    ENABLE_CACHING: z.string().transform(v => v === "true").default("true"),
  },

  client: {
    // No client-side variables needed for research bots
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
    GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    NODE_ENV: process.env.NODE_ENV,
    MAX_SEARCH_RESULTS: process.env.MAX_SEARCH_RESULTS,
    ENABLE_CACHING: process.env.ENABLE_CACHING,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});