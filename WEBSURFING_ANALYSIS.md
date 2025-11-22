# WebSurfing Project Analysis: Key Components & Architecture

## Project Overview

**WebSurfing** (aka "Better Clay") is an AI-powered spreadsheet platform for lead enrichment and web research. It leverages Google Gemini 2.5 Flash through Vertex AI, Mastra agents framework, and a Next.js + PostgreSQL backend.

**Core Value Proposition:**
- Real-time Google Search integration (fresh data, not databases)
- AI-powered data extraction from web results
- "Bring Your Own Keys" model (BYOK) - use your own API keys, control costs
- Template-based enrichment workflows

---

## 1. MASTRA CONFIGURATION & AGENTS

### 1.1 Mastra Initialization
**File:** `/src/mastra/index.ts`

```typescript
export const mastra = new Mastra({
  agents: {
    testAgent,
    spreadsheetAgent,
  },
  storage: new PostgresStore({
    connectionString: env.DATABASE_URL,
  }),
  logger: new PinoLogger({
    name: "VibeSurfers",
    level: "info",
  }),
  telemetry: { enabled: false },
  observability: { default: { enabled: false } },
});
```

**Key Points:**
- Uses PostgreSQL for persistent memory storage (PostgresStore)
- Disables telemetry for privacy/cost
- Pino logger for logging
- Two main agents exported: testAgent and spreadsheetAgent

### 1.2 Main Agent: Spreadsheet Agent
**File:** `/src/mastra/agents/spreadsheet-agent.ts`

**Name:** "VibeSurfers Spreadsheet Agent"
**Description:** Intelligent spreadsheet assistant for searches, row creation, and sheet modifications

**Core Capabilities:**
1. **Sheet Reading** - Uses sheetReaderTool to understand structure
2. **Bulk Row Creation** - Search → Preview → Execute workflow
3. **Row Management** - Delete rows, delete empty rows
4. **Column Management** - Add/remove/reorder columns with operator configuration
5. **Search Strategies** - Google Maps for places, Google Search for general info
6. **CSV Import** - Analyze and import CSV files
7. **Column Customization** - Set operator types and custom prompts

**Model:** `vertex("gemini-2.5-flash")`

**Memory Configuration:**
```typescript
memory: new Memory({
  options: {
    lastMessages: 20,
    semanticRecall: false,
    workingMemory: {
      enabled: true,
      scope: "resource", // Per-sheet memory
      template: "Sheet context template..."
    },
  },
});
```

**Tools Available:**
- sheetReaderTool
- sheetWriterTool
- columnManagerTool
- rowManagerTool
- sheetConfigTool
- csvAnalyzerTool
- googleSearchTool
- googleMapsTool

### 1.3 Test Agent
**File:** `/src/mastra/agents/test-agent.ts`

Simple agent to verify Mastra setup:
- Model: `vertex("gemini-2.5-flash")`
- Used for integration testing
- Memory: Last 10 messages, no semantic recall

---

## 2. GEMINI INTEGRATION

### 2.1 Vertex AI Provider Configuration
**File:** `/src/mastra/lib/vertex.ts`

```typescript
import { createVertex } from "@ai-sdk/google-vertex";
import { env } from "@/env";

export const vertex = createVertex({
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION,
  googleAuthOptions: {
    credentials: JSON.parse(env.GOOGLE_CREDENTIALS_JSON),
  },
});
```

**Setup:**
- Uses `@ai-sdk/google-vertex` package (^3.0.60)
- Service account credentials from JSON
- Centralized vertex provider instance used across all agents

### 2.2 Gemini Client Utility
**File:** `/src/server/gemini/client.ts`

```typescript
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const project = env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const location = env.GOOGLE_CLOUD_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (credsJson = process.env.GOOGLE_CREDENTIALS_JSON) {
      // Parse JSON credentials from environment
      const credentials = JSON.parse(credsJson);
      geminiClient = new GoogleGenAI({
        vertexai: true,
        project: project,
        location: location,
        googleAuthOptions: { credentials },
      });
    } else {
      // Use GOOGLE_APPLICATION_CREDENTIALS file or system ADC
      geminiClient = new GoogleGenAI({
        vertexai: true,
        project: project,
        location: location,
      });
    }
  }
  return geminiClient;
}
```

**Authentication Methods:**
1. **GOOGLE_CREDENTIALS_JSON**: JSON string in environment (for production/Vercel)
2. **GOOGLE_APPLICATION_CREDENTIALS**: File path to service account JSON
3. **System ADC**: `~/.config/gcloud/application_default_credentials.json`

### 2.3 Gemini Configuration
**File:** `/src/server/gemini/config.ts`

**Available Models:**
- `gemini-2.5-flash` (default) - Fast, cost-effective
- `gemini-2.5-flash-lite` - Ultra-fast, lighter weight
- `gemini-2.5-pro` - Most capable
- `gemini-2.0-flash` - Previous generation
- `gemini-embedding-001` - For embeddings

**Generation Configs:**
```typescript
DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,
}

CONSERVATIVE_GENERATION_CONFIG = {
  temperature: 0.2,  // More deterministic
  topK: 10,
  topP: 0.9,
  maxOutputTokens: 8192,
}

CREATIVE_GENERATION_CONFIG = {
  temperature: 1.0,  // More diverse
  topK: 50,
  topP: 0.98,
  maxOutputTokens: 8192,
}
```

**Safety Settings:**
- HARM_CATEGORY_HARASSMENT: BLOCK_MEDIUM_AND_ABOVE
- HARM_CATEGORY_HATE_SPEECH: BLOCK_MEDIUM_AND_ABOVE
- HARM_CATEGORY_SEXUALLY_EXPLICIT: BLOCK_MEDIUM_AND_ABOVE
- HARM_CATEGORY_DANGEROUS_CONTENT: BLOCK_MEDIUM_AND_ABOVE

**Rate Limiting:**
- maxRetries: 3
- retryDelay: 1000ms
- maxConcurrentRequests: 10
- requestTimeout: 60s

**Pricing (per 1M tokens):**
- Flash: $0.075 input, $0.30 output
- Pro: $1.25 input, $5.00 output
- Embedding: $0.15 input

---

## 3. WEB SEARCH IMPLEMENTATION

### 3.1 Google Search Tool
**File:** `/src/mastra/tools/google-search.ts`

Uses Gemini's native Google Search grounding capability:

```typescript
export const googleSearchTool = createTool({
  id: "google-search",
  description: "Search Google for real-time information using Gemini's grounding",
  inputSchema: z.object({
    query: z.string(),
    maxResults: z.number().optional().default(10),
    location: z.string().optional(),
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
    const searchQuery = location ? `${query} in ${location}` : query;

    // Use Gemini with Google Search grounding
    const result = await generateText({
      model: vertex("gemini-2.5-flash"),
      tools: { google_search: vertex.tools.googleSearch({}) },
      prompt: `Search for: ${searchQuery}

Return the top ${maxResults} results in JSON format...`,
    });

    // Parse and clean results
    // - Remove markdown code blocks
    // - Extract actual URLs (not redirect URLs)
    // - Return structured results
  },
});
```

**Key Features:**
- Grounding tool that fetches fresh web results
- Returns title, URL, and snippet
- Handles location context
- Cleans redirect URLs to get actual destinations
- JSON parsing with fallback to text

### 3.2 Google Maps Tool
**File:** `/src/mastra/tools/google-maps.ts`

Uses Gemini's Google Maps grounding for place-based searches:

```typescript
export const googleMapsTool = createTool({
  id: "google-maps",
  description: "Search for places using Google Maps integration",
  inputSchema: z.object({
    placeType: z.string(),      // e.g., "pizza restaurant"
    location: z.string(),        // e.g., "San Francisco"
    maxResults: z.number().optional().default(20),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    places: z.array(z.object({
      name: z.string(),
      address: z.string().optional(),
      placeId: z.string().optional(),
      rating: z.string().optional(),
      uri: z.string(),
    })),
    searchQuery: z.string(),
    resultCount: z.number(),
    widgetToken: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const genAI = getGeminiClient();

    const config = {
      tools: [{ googleMaps: { enableWidget: true } }],
      toolConfig: latitude && longitude ? {
        retrievalConfig: {
          latLng: { latitude, longitude },
        },
      } : undefined,
    };

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find top ${maxResults} ${placeType} near ${location}...`,
      config,
    });

    // Extract grounded locations from groundingMetadata
    const places = response.candidates?.[0]?.groundingMetadata
      ?.groundingChunks
      ?.filter(chunk => chunk.maps)
      .map(chunk => ({
        name: chunk.maps?.title,
        address: chunk.maps?.address,
        placeId: chunk.maps?.placeId,
        rating: chunk.maps?.rating?.toString(),
        uri: chunk.maps?.uri,
      })) || [];

    // Fallback to text parsing if no grounded results
  },
});
```

**Key Features:**
- Direct integration with Google Maps API via Gemini
- Extracts structured place data (name, address, rating, URI)
- Optional latitude/longitude for precise location
- Maps widget context token for UI display
- Text fallback when grounding fails

---

## 4. SPREADSHEET TOOLS

### 4.1 Sheet Reader Tool
**File:** `/src/mastra/tools/sheet-reader.ts`

Reads complete spreadsheet state:
```typescript
Input: {
  sheetId: string (UUID),
  includeRows: boolean (default: true),
  rowLimit: number (default: 100),
}

Output: {
  success: boolean,
  sheet: { id, name, templateType, templateId, systemPrompt, isAutonomous, createdAt },
  columns: Array<{ id, title, position, dataType }>,
  rows: Array<{ rowIndex, cells: Record<colIndex, content> }>,
  rowCount: number,
  columnCount: number,
}
```

**Database Queries:**
1. Fetch sheet metadata
2. Fetch template system prompt if exists
3. Fetch all columns (ordered by position)
4. Fetch all cells (grouped by row)

### 4.2 Sheet Writer Tool
**File:** `/src/mastra/tools/sheet-writer.ts`

Writes bulk rows to spreadsheet with preview/execute modes:

```typescript
Input: {
  sheetId: string,
  userId: string,
  mode: "preview" | "execute",
  rows: Array<Array<string>>,  // Each row is array of cell values
  startingRow: number (default: 0),
}

Output: {
  success: boolean,
  mode: "preview" | "execute",
  rowsCreated?: number,
  rowsPreview?: Array<{ rowIndex, cells }>,
  sample?: Array<first 3 rows>,
  eventsCreated?: number,
  message?: string,
}
```

**Workflow:**
1. **Preview Mode**: Returns what will be created without writing to DB
2. **Execute Mode**: 
   - Writes cells to database in batches (batch size: 100)
   - Creates events for first column of each row
   - Events trigger AI operators to fill remaining columns automatically

### 4.3 Column Manager Tool
**File:** `/src/mastra/tools/column-manager.ts`

Manages column operations:

```typescript
Actions:
- add:     Create new column with optional processing of existing rows
- remove:  Delete column by ID
- reorder: Change column position
- update:  Update column configuration (operatorType, prompt, etc.)

Input (for ADD):
{
  title: string,
  position: number,
  dataType: string (default: "text"),
  processExistingRows: boolean (default: true),  // Auto-fill new column
  userId: string,  // For creating events
  operatorType?: string,  // google_search, url_context, structured_output, function_calling
  operatorConfig?: object,
  prompt?: string,
}
```

### 4.4 Row Manager Tool
**File:** `/src/mastra/tools/row-manager.ts`

Manages row operations:
- `delete`: Delete specific rows by indices
- `delete_empty`: Delete empty rows (useful for cleanup)

### 4.5 Sheet Config Tool
**File:** `/src/mastra/tools/sheet-config.ts`

Configures how columns are processed:
- Set operatorType (how the column processes data)
- Set custom prompts for operators
- Configure column behavior

### 4.6 CSV Analyzer Tool
**File:** `/src/mastra/tools/csv-analyzer.ts`

Analyzes uploaded CSV files:
- Parses CSV structure
- Maps CSV headers to sheet columns
- Detects issues (empty columns, large files)
- Prepares for import with sheetWriterTool

---

## 5. ENVIRONMENT VARIABLES

### 5.1 Configuration Schema
**File:** `/src/env.js`

```typescript
export const env = createEnv({
  server: {
    // Auth (required in production, optional in dev)
    AUTH_SECRET: z.string().optional(),
    AUTH_URL: z.string().url().optional(),
    AUTH_GOOGLE_ID: z.string().optional(),
    AUTH_GOOGLE_SECRET: z.string().optional(),
    
    // Database (required)
    DATABASE_URL: z.string().url().optional(),
    
    // Vertex AI / Gemini (required)
    GOOGLE_CLOUD_PROJECT: z.string(),
    GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
    GOOGLE_CREDENTIALS_JSON: z.string(),
    
    // Optional
    VERTEX_API_KEY: z.string().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  // ... client variables, runtime env config
});
```

### 5.2 Environment File Template
**File:** `.env.example`

```bash
# Auth (required in production, optional in development)
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Database (required in production, optional in development)
DATABASE_URL=""

# Vertex AI / Gemini Configuration
GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"

# Google Service Account Credentials (JSON string)
# Download from Google Cloud Console > IAM & Admin > Service Accounts
# Copy entire JSON including outer braces as single-line string
GOOGLE_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"...","...":"..."}'
```

### 5.3 Required Variables for Different Deployments

**Local Development (Minimum):**
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CREDENTIALS_JSON`
- `DATABASE_URL` (PostgreSQL)

**Vercel Production:**
- All of the above
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`
- `AUTH_URL` (canonical URL)

**Authentication Credentials:**
- Service account JSON from Google Cloud Console
- OAuth credentials from Google Cloud OAuth 2.0 setup
- Random secret for session signing: `openssl rand -base64 32`

---

## 6. PROJECT STRUCTURE

```
/src
├── /mastra                      # Mastra AI orchestration
│   ├── /agents
│   │   ├── spreadsheet-agent.ts (main agent for spreadsheet ops)
│   │   └── test-agent.ts        (simple test/verification agent)
│   ├── /lib
│   │   └── vertex.ts            (Vertex AI provider configuration)
│   ├── /tools
│   │   ├── google-search.ts     (web search via Gemini grounding)
│   │   ├── google-maps.ts       (place search via Maps grounding)
│   │   ├── sheet-reader.ts      (read spreadsheet state)
│   │   ├── sheet-writer.ts      (bulk write with preview/execute)
│   │   ├── column-manager.ts    (manage columns)
│   │   ├── row-manager.ts       (manage rows)
│   │   ├── sheet-config.ts      (configure operator behavior)
│   │   ├── csv-analyzer.ts      (analyze CSV uploads)
│   │   └── index.ts             (export all tools)
│   └── index.ts                 (Mastra initialization)
│
├── /server
│   ├── /gemini
│   │   ├── config.ts            (model configs, generation settings)
│   │   └── client.ts            (GoogleGenAI client singleton)
│   ├── /db
│   │   ├── index.ts             (database connection)
│   │   └── schema.ts            (Drizzle ORM tables)
│   ├── /api
│   │   ├── /routers             (tRPC routers)
│   │   ├── root.ts              (tRPC router composition)
│   │   └── trpc.ts              (tRPC initialization)
│   ├── /auth
│   │   ├── config.ts            (NextAuth configuration)
│   │   └── index.ts             (auth handlers)
│   ├── /operators               (column data processors)
│   ├── /templates               (column templates)
│   ├── background-processor.ts  (async event processing)
│   ├── startup.ts               (initialization)
│   └── ...other services
│
├── /app
│   ├── /api                     (Next.js API routes)
│   ├── /sheets                  (spreadsheet UI pages)
│   ├── /templates               (template UI)
│   ├── agent-test               (agent testing interface)
│   └── ...other pages
│
├── /components                  (React components)
├── /hooks                       (React hooks)
├── /types                       (TypeScript types)
├── /styles                      (Tailwind CSS)
├── env.js                       (environment validation)
└── tsconfig.json
```

---

## 7. DEPENDENCIES

### Core Framework
- `next@^15.2.3` - React framework
- `react@^19.0.0` - UI library
- `@trpc/server@^11.0.0` - RPC framework

### AI & Search
- `@ai-sdk/google-vertex@^3.0.60` - Vertex AI provider for Vercel AI SDK
- `@mastra/core@^0.24.0` - Agent orchestration
- `@mastra/memory@^0.15.11` - Memory for agents
- `@mastra/pg@^0.17.8` - PostgreSQL storage for Mastra
- `@google/genai@^1.29.0` - Google Generative AI client

### Database & ORM
- `drizzle-orm@^0.41.0` - Type-safe ORM
- `postgres@^3.4.4` - PostgreSQL client

### Authentication
- `next-auth@5.0.0-beta.25` - Auth provider
- `@auth/drizzle-adapter@^1.7.2` - NextAuth + Drizzle integration

### UI & Styling
- `@tiptap/react@^3.10.4` - Rich text editor
- `@radix-ui/*` - Accessible UI components
- `tailwindcss@^4.0.15` - CSS framework

### Utilities
- `zod@^3.24.2` - Schema validation
- `@t3-oss/env-nextjs@^0.12.0` - Environment variable validation
- `papaparse@^5.5.3` - CSV parsing

---

## 8. AGENT WORKFLOW PATTERNS

### Pattern 1: Search → Preview → Confirm → Execute

```
User: "find top 20 pizzas in SF"
  ↓
Agent reads request and searches using googleMapsTool
  ↓
Agent calls sheetWriterTool with mode='preview'
  ↓
Agent shows preview to user with sample data
  ↓
User confirms with "yes" or similar
  ↓
Agent calls sheetWriterTool with mode='execute'
  ↓
Rows created, events queued for automatic data enrichment
```

### Pattern 2: Bulk Import via CSV

```
User uploads CSV file
  ↓
Agent analyzes with csvAnalyzerTool
  ↓
Agent shows file info and column mapping
  ↓
User confirms import
  ↓
Agent uses columnManagerTool to create columns if needed
  ↓
Agent uses sheetWriterTool mode='execute' to import all rows
```

### Pattern 3: Search for Information

```
User: "search for [company] latest news"
  ↓
Agent uses googleSearchTool
  ↓
Results include title, URL, snippet
  ↓
Agent can extract more data using URL context (in operators)
```

---

## 9. KEY DESIGN PATTERNS

### 1. **Two-Stage Write Pattern**
- **Preview**: Agent shows what will be created without database writes
- **Execute**: User confirms, data actually written
- Prevents accidental bulk modifications

### 2. **Event-Driven Processing**
- Sheet writes create events for first column only
- Existing operator system processes remaining columns
- Enables async data enrichment without agent intervention

### 3. **Grounding for Accuracy**
- Google Search grounding tool = real-time web data
- Google Maps grounding = structured place data
- Better than static databases for lead enrichment

### 4. **Tool Composition**
- Agents combine multiple tools to accomplish tasks
- Each tool has clear input/output schemas
- Tools call back to main system (sheet reader, writer, etc.)

### 5. **Per-Resource Memory**
- Agents maintain working memory per sheet
- Tracks current sheet context, pending previews, etc.
- Enables stateful multi-turn conversations

---

## 10. CRITICAL FILES TO ADAPT

For your worldtrue project, key files to copy and adapt:

1. **Mastra Agent Setup**
   - `/src/mastra/index.ts` - Initialize Mastra instance
   - `/src/mastra/agents/spreadsheet-agent.ts` - Create your own agent with custom tools
   - `/src/mastra/lib/vertex.ts` - Vertex AI provider configuration

2. **Gemini Integration**
   - `/src/server/gemini/config.ts` - Gemini model configurations
   - `/src/server/gemini/client.ts` - GoogleGenAI client initialization
   - `/src/mastra/tools/google-search.ts` - Search grounding implementation

3. **Environment Setup**
   - `/src/env.js` - Environment variable schema validation
   - `.env.example` - Template for required variables

4. **Database**
   - `/src/server/db/schema.ts` - Drizzle ORM schema (customize for your data model)
   - `/src/server/db/index.ts` - Database connection

5. **Tool Development**
   - `/src/mastra/tools/*.ts` - Templates for creating new tools
   - Use `createTool()` from @mastra/core/tools

---

## 11. DEPLOYMENT NOTES

### Environment Variable Management
- **Local Dev**: Use `.env` file with `gcloud auth application-default login`
- **Vercel**: Set environment variables in Vercel dashboard
- **Docker**: Pass env vars via runtime (not during build)

### Database Migrations
```bash
pnpm db:generate  # Generate migration files
pnpm db:push      # Push to database
pnpm db:migrate   # Run migrations
```

### Testing
```bash
pnpm test:gemini:search    # Test Google Search grounding
pnpm test:gemini:url       # Test URL context extraction
pnpm test:gemini:all       # Run all Gemini tests
```

---

## 12. COST OPTIMIZATION (BYOK Model)

Since this is BYOK (Bring Your Own Keys), costs are controlled by:

1. **Model Selection**: Flash (cheapest) vs Pro (most capable)
2. **Token Usage**: Shorter prompts, fewer API calls
3. **Caching**: Search results cached for 30 min, embeddings for 1 hour
4. **Rate Limiting**: Prevents accidental high-cost operations

**Pricing Reference:**
- Gemini 2.5 Flash: $0.075/M input, $0.30/M output
- Gemini 2.5 Pro: $1.25/M input, $5.00/M output

---

## SUMMARY

**To replicate in worldtrue project:**

1. Install dependencies: `@mastra/core`, `@ai-sdk/google-vertex`, `@google/genai`
2. Set up Vertex AI provider in `/src/mastra/lib/vertex.ts`
3. Configure Mastra instance with your agents
4. Create custom tools using `createTool()` pattern
5. Set up environment variables for Google Cloud
6. Use agent memory for stateful conversations
7. Implement tools with clear input/output schemas
8. Use grounding tools for web search accuracy

The architecture is highly modular - agents, tools, and models can be swapped/configured independently.
