import { createVertex } from "@ai-sdk/google-vertex";
import { env } from "../../env";

/**
 * Configured Vertex AI provider instance for WorldTrue research bots
 * Uses service account credentials from environment variables
 */
export const vertex = createVertex({
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
  googleAuthOptions: {
    credentials: JSON.parse(env.GOOGLE_CREDENTIALS_JSON),
  },
});