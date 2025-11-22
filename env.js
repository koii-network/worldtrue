import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Database Configuration
    DATABASE_URL: z.string().url().describe("NeonDB PostgreSQL connection string"),

    // Google Cloud Configuration for Gemini/Vertex AI
    GOOGLE_CLOUD_PROJECT: z.string().describe("Google Cloud project ID"),
    GOOGLE_CLOUD_LOCATION: z.string().default("us-central1").describe("Google Cloud region"),
    GOOGLE_CREDENTIALS_JSON: z.string().describe("Service account credentials JSON string"),

    // Optional configurations
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  client: {
    // Add any public environment variables here if needed
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
    GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,
    NODE_ENV: process.env.NODE_ENV,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});