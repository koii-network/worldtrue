# WebSurfing Integration Implementation Guide

## Quick Copy-Paste Templates

### 1. Environment Configuration

Create `.env` file with:

```bash
# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"

# Service Account JSON (download from Google Cloud Console)
# Format: single-line JSON string with escaped newlines
GOOGLE_CREDENTIALS_JSON='{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@...iam.gserviceaccount.com","...":"..."}'

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Auth (optional for dev)
AUTH_SECRET="your-random-secret"
AUTH_GOOGLE_ID="your-google-oauth-id"
AUTH_GOOGLE_SECRET="your-google-oauth-secret"
```

### 2. Environment Validation Schema

Create `/src/env.js`:

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    GOOGLE_CLOUD_PROJECT: z.string(),
    GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
    GOOGLE_CREDENTIALS_JSON: z.string(),
    DATABASE_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {},
  runtimeEnv: {
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
    GOOGLE_CLOUD_LOCATION: process.env.GOOGLE_CLOUD_LOCATION,
    GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

### 3. Vertex AI Provider Setup

Create `/src/mastra/lib/vertex.ts`:

```typescript
import { createVertex } from "@ai-sdk/google-vertex";
import { env } from "@/env";

/**
 * Configured Vertex AI provider instance
 * Used by all agents and tools for Gemini access
 */
export const vertex = createVertex({
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
  googleAuthOptions: {
    credentials: JSON.parse(env.GOOGLE_CREDENTIALS_JSON),
  },
});
```

### 4. Gemini Client Singleton

Create `/src/server/gemini/client.ts`:

```typescript
import { GoogleGenAI } from "@google/genai";
import { env } from "@/env";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const project = env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const location = env.GOOGLE_CLOUD_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (!project) {
      throw new Error("GOOGLE_CLOUD_PROJECT is not configured");
    }

    const credsJson = process.env.GOOGLE_CREDENTIALS_JSON;

    if (credsJson) {
      try {
        const credentials = JSON.parse(credsJson);
        geminiClient = new GoogleGenAI({
          vertexai: true,
          project: project,
          location: location,
          googleAuthOptions: { credentials },
        });
        console.log(`[Gemini Client] Initialized with Vertex AI`);
      } catch (error) {
        throw new Error(`Failed to parse GOOGLE_CREDENTIALS_JSON: ${error}`);
      }
    } else {
      geminiClient = new GoogleGenAI({
        vertexai: true,
        project: project,
        location: location,
      });
    }
  }

  return geminiClient;
}

export function resetGeminiClient(): void {
  geminiClient = null;
}
```

### 5. Mastra Configuration

Create `/src/mastra/index.ts`:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { PostgresStore } from "@mastra/pg";
import { env } from "@/env";

// Import your agents
import { yourCustomAgent } from "./agents/your-custom-agent";

export const mastra = new Mastra({
  agents: {
    yourCustomAgent,
  },
  storage: new PostgresStore({
    connectionString: env.DATABASE_URL,
  }),
  logger: new PinoLogger({
    name: "YourApp",
    level: "info",
  }),
  telemetry: {
    enabled: false,
  },
  observability: {
    default: { enabled: false },
  },
});

export function getYourCustomAgent() {
  return mastra.getAgent("yourCustomAgent");
}
```

### 6. Creating a Custom Agent

Create `/src/mastra/agents/your-custom-agent.ts`:

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { vertex } from "../lib/vertex";
import {
  yourCustomTool1,
  yourCustomTool2,
} from "../tools";

export const yourCustomAgent = new Agent({
  name: "Your Custom Agent",
  description: "Description of what your agent does",
  instructions: `You are a helpful assistant that...

## Your Capabilities

1. **Capability 1**
   - Details about capability 1
   - How to use it

2. **Capability 2**
   - Details about capability 2

## Important Rules

- Always be helpful
- Explain what you're doing
- Ask for confirmation when needed

## Example Interaction

User: "Do something"
You: "I'll help you with that..."
[Use tools to accomplish task]
"Done! Here's what happened..."`,
  
  model: vertex("gemini-2.5-flash"),
  
  tools: {
    yourCustomTool1,
    yourCustomTool2,
  },
  
  memory: new Memory({
    options: {
      lastMessages: 20,
      semanticRecall: false,
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: `# Current Session Context

## State
- Last Action: None
- Context: Unknown
`,
      },
    },
  }),
});
```

### 7. Creating a Custom Tool

Create `/src/mastra/tools/your-custom-tool.ts`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const yourCustomTool = createTool({
  id: "your-tool-id",
  description: "Description of what this tool does",
  inputSchema: z.object({
    param1: z.string().describe("Description of param1"),
    param2: z.number().optional().describe("Description of param2"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.string(),
    details: z.object({}).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { param1, param2 } = context;
      
      console.log(`[Your Tool] Processing: param1=${param1}, param2=${param2}`);

      // Do your work here
      const result = "some result";

      return {
        success: true,
        result,
        details: {
          processed: true,
        },
      };
    } catch (error) {
      console.error("[Your Tool] Error:", error);
      return {
        success: false,
        result: "",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
```

### 8. Google Search Tool (Copy & Adapt)

Create `/src/mastra/tools/google-search.ts`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { vertex } from "../lib/vertex";
import { generateText } from "ai";

export const googleSearchTool = createTool({
  id: "google-search",
  description: "Search Google for real-time information using Gemini grounding",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z.number().optional().default(10),
    location: z.string().optional().describe("Optional location context"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
    })),
    searchQuery: z.string(),
    resultCount: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { query, maxResults, location } = context;
      const searchQuery = location ? `${query} in ${location}` : query;

      console.log(`[Google Search] Searching for: "${searchQuery}"`);

      // Use Gemini with Google Search grounding
      const result = await generateText({
        model: vertex("gemini-2.5-flash"),
        tools: { google_search: vertex.tools.googleSearch({}) },
        prompt: `Search for: ${searchQuery}

Return the top ${maxResults} results in this JSON format:
{
  "results": [
    {
      "title": "Result Title",
      "url": "https://example.com",
      "snippet": "Brief description"
    }
  ]
}

Return ONLY valid JSON, no markdown.`,
      });

      console.log(`[Google Search] Raw response:`, result.text);

      // Parse JSON response
      let parsedResults: { results: Array<{ title: string; url: string; snippet: string }> } = { results: [] };

      try {
        let jsonText = result.text;
        // Remove markdown code blocks if present
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Extract JSON
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResults = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn("[Google Search] JSON parse failed, using text fallback", parseError);
        parsedResults = {
          results: [{
            title: searchQuery,
            url: "",
            snippet: result.text.slice(0, 200),
          }]
        };
      }

      const results = parsedResults.results.slice(0, maxResults);

      console.log(`[Google Search] Found ${results.length} results`);

      return {
        success: true,
        results,
        searchQuery,
        resultCount: results.length,
      };
    } catch (error) {
      console.error("[Google Search] Error:", error);
      return {
        success: false,
        results: [],
        searchQuery: context.query,
        resultCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
```

### 9. Tool Export Index

Create `/src/mastra/tools/index.ts`:

```typescript
/**
 * Mastra Tools - Central export point
 */

export { yourCustomTool } from "./your-custom-tool";
export { googleSearchTool } from "./google-search";
// Export other tools...
```

### 10. Package.json Dependencies

Add to your `package.json`:

```json
{
  "dependencies": {
    "@ai-sdk/google-vertex": "^3.0.60",
    "@google/genai": "^1.29.0",
    "@mastra/core": "^0.24.0",
    "@mastra/memory": "^0.15.11",
    "@mastra/pg": "^0.17.8",
    "@t3-oss/env-nextjs": "^0.12.0",
    "zod": "^3.24.2"
  }
}
```

Then: `pnpm install`

---

## Common Patterns

### Pattern 1: Using Tools in an Agent

```typescript
// In your agent's instructions:
`
When user asks you to search, use googleSearchTool:
- Pass the query
- Extract relevant URLs and snippets
- Present results to user
`

// Agent automatically calls it like:
// await tools.googleSearchTool.execute({
//   context: { query: "...", maxResults: 10 }
// });
```

### Pattern 2: Error Handling in Tools

```typescript
execute: async ({ context }) => {
  try {
    // Your logic here
    if (!context.requiredParam) {
      return {
        success: false,
        error: "Missing required parameter: requiredParam",
      };
    }
    
    // Process...
    return { success: true, result: ... };
  } catch (error) {
    console.error("[Tool] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### Pattern 3: Composing Multiple Tools

```typescript
// In agent instructions:
`
For complex queries:
1. Use googleSearchTool to find information
2. Use yourProcessingTool to extract key data
3. Use yourStorageTool to save results
4. Report completion to user
`
```

---

## Testing Your Setup

### Test 1: Environment Variables

```bash
node -e "console.log(process.env.GOOGLE_CLOUD_PROJECT)"
# Should output your GCP project ID
```

### Test 2: Vertex AI Provider

Create `/test-vertex.ts`:

```typescript
import { vertex } from "./src/mastra/lib/vertex";

async function test() {
  const response = await vertex("gemini-2.5-flash").generateText({
    prompt: "Say hello!",
  });
  console.log(response.text);
}

test().catch(console.error);
```

Run: `npx tsx test-vertex.ts`

### Test 3: Gemini Client

Create `/test-gemini-client.ts`:

```typescript
import { getGeminiClient } from "./src/server/gemini/client";

async function test() {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Say hello!",
  });
  console.log(response.candidates?.[0]?.content?.parts?.[0]);
}

test().catch(console.error);
```

Run: `npx tsx test-gemini-client.ts`

### Test 4: Google Search Tool

```typescript
import { googleSearchTool } from "./src/mastra/tools/google-search";

async function test() {
  const result = await googleSearchTool.execute({
    context: {
      query: "latest AI news",
      maxResults: 5,
    },
  });
  console.log(JSON.stringify(result, null, 2));
}

test().catch(console.error);
```

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In your agent or tool
console.log(`[ComponentName] Event: `, { key: value });
console.error(`[ComponentName] Error: `, error);
```

### Check Credentials

```bash
# Verify credentials file exists
cat $GOOGLE_APPLICATION_CREDENTIALS

# Or verify env var is set
echo $GOOGLE_CREDENTIALS_JSON
```

### Test Groundi Tools

```typescript
// Direct test of Google Search grounding
const result = await generateText({
  model: vertex("gemini-2.5-flash"),
  tools: { google_search: vertex.tools.googleSearch({}) },
  prompt: "Search for: latest AI breakthroughs 2024",
});
console.log(result.text);
```

---

## Cost Monitoring

Since you're using BYOK (Bring Your Own Keys):

1. **Monitor in Google Cloud Console**
   - Go to Billing > Reports
   - Filter by Vertex AI API calls

2. **Estimate costs**
   - Flash: ~$0.00375 per 1000 search queries
   - Pro: ~$0.1875 per 1000 queries
   - Per-token pricing applies

3. **Optimize usage**
   - Use Flash model (cheaper, fast enough)
   - Cache search results (30 min TTL in WebSurfing)
   - Limit maxResults parameter
   - Use conservative generation configs when possible

---

## Troubleshooting

### Issue: "GOOGLE_CLOUD_PROJECT is not configured"

Solution: Add to `.env`:
```
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
```

### Issue: "Invalid service account credentials"

Solution: Ensure `GOOGLE_CREDENTIALS_JSON` is:
- Valid JSON
- Single-line (with escaped newlines: `\n`)
- Includes all required fields
- Valid private key format

Example:
```bash
# WRONG:
GOOGLE_CREDENTIALS_JSON={
  "type": "service_account",
  ...
}

# RIGHT:
GOOGLE_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}'
```

### Issue: "Tool not found" or "Undefined tool"

Solution: Check `/src/mastra/tools/index.ts` exports all tools:
```typescript
export { yourTool } from "./your-tool";
```

And import in agent:
```typescript
import { yourTool } from "../tools";

// In agent definition:
tools: {
  yourTool,
}
```

### Issue: Agents not responding

Solution:
1. Check database connection (`DATABASE_URL`)
2. Verify Mastra is initialized correctly
3. Check agent logs for errors
4. Ensure tools are properly exported

---

## Next Steps

1. Copy the templates above to your project
2. Set up environment variables
3. Test the Vertex AI provider
4. Create your first custom agent
5. Add custom tools as needed
6. Monitor costs in GCP console

For more details, see `WEBSURFING_ANALYSIS.md` in your project root.
