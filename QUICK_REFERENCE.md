# WebSurfing Quick Reference Card

## File Locations in WebSurfing Project

```
/src/mastra/
├── index.ts ......................... Mastra initialization (copy & customize)
├── agents/
│   ├── spreadsheet-agent.ts ......... Example agent with detailed instructions
│   └── test-agent.ts ............... Simple test agent
├── lib/
│   └── vertex.ts ................... Vertex AI provider (COPY THIS)
└── tools/
    ├── google-search.ts ............ Google Search grounding (COPY THIS)
    ├── google-maps.ts ............. Google Maps grounding (reference)
    ├── sheet-reader.ts ............ Sheet data reading (reference)
    ├── sheet-writer.ts ............ Bulk write with preview/execute (reference)
    ├── column-manager.ts .......... Column operations (reference)
    ├── row-manager.ts ............. Row operations (reference)
    └── index.ts ................... Tools export

/src/server/
├── gemini/
│   ├── client.ts .................. GoogleGenAI singleton (COPY THIS)
│   └── config.ts .................. Model configs & constants (reference)
└── db/
    ├── schema.ts .................. Drizzle ORM schema (customize)
    └── index.ts ................... DB connection

/src/
└── env.js .......................... Environment validation (COPY THIS)

/.env.example ........................ Template (reference)
/package.json ........................ Dependencies (reference)
```

---

## Critical Files to Copy (In Order)

### 1. src/env.js
Environment variable schema with Zod validation.
- Change variables to match your project needs
- Keep `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CREDENTIALS_JSON`

### 2. src/mastra/lib/vertex.ts
Vertex AI provider initialization.
- Exact copy (no changes needed)
- Uses `env.GOOGLE_CLOUD_PROJECT`, `env.GOOGLE_CLOUD_LOCATION`, `env.GOOGLE_CREDENTIALS_JSON`

### 3. src/server/gemini/client.ts
GoogleGenAI singleton client.
- Exact copy (no changes needed)
- Fallback support for service account JSON or file-based credentials

### 4. src/mastra/index.ts
Mastra initialization.
- Copy and update agent imports/names
- Customize telemetry if needed

### 5. src/mastra/tools/google-search.ts
Google Search grounding tool.
- Exact copy (or adapt JSON parsing for your needs)
- Uses Gemini 2.5 Flash model

### 6. src/mastra/tools/index.ts
Tool exports.
- Copy and add your tool exports

### 7. src/mastra/agents/your-agent.ts
Create your custom agent.
- Use spreadsheet-agent.ts as template
- Define name, description, instructions
- Assign tools
- Configure memory

---

## Essential Dependencies

```bash
pnpm add \
  @ai-sdk/google-vertex@^3.0.60 \
  @google/genai@^1.29.0 \
  @mastra/core@^0.24.0 \
  @mastra/memory@^0.15.11 \
  @mastra/pg@^0.17.8 \
  zod@^3.24.2 \
  @t3-oss/env-nextjs@^0.12.0
```

---

## Environment Variables (Required)

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Service Account (JSON string, single-line)
GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'

# Database (if using)
DATABASE_URL=postgresql://...

# Node environment
NODE_ENV=development
```

---

## Key Concepts

### Agents
- Orchestrate tools and manage conversation state
- Support memory (per-resource scope)
- Use Gemini 2.5 Flash by default
- Define via `new Agent({ name, description, instructions, model, tools, memory })`

### Tools
- Created with `createTool()` from @mastra/core/tools
- Have inputSchema (Zod) and outputSchema (Zod)
- Execute function receives { context } with validated input
- Return output matching outputSchema

### Vertex Provider
- Configured once in `/src/mastra/lib/vertex.ts`
- Used by agents and tools via `vertex("model-name")`
- Supports multiple models: gemini-2.5-flash, gemini-2.5-pro, etc.

### Grounding
- Google Search grounding: Real-time web search results
- Google Maps grounding: Structured place data
- Built into Gemini models via `vertex.tools.googleSearch()` etc.

---

## Common Tasks

### Task 1: Create a New Agent

```typescript
// /src/mastra/agents/my-agent.ts
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { vertex } from "../lib/vertex";
import { myTool } from "../tools";

export const myAgent = new Agent({
  name: "My Agent",
  description: "What it does",
  instructions: "Your instructions here...",
  model: vertex("gemini-2.5-flash"),
  tools: { myTool },
  memory: new Memory({ options: { lastMessages: 20 } }),
});
```

### Task 2: Create a New Tool

```typescript
// /src/mastra/tools/my-tool.ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "my-tool",
  description: "What it does",
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.string(),
  }),
  execute: async ({ context }) => {
    // Implementation
    return { success: true, result: "..." };
  },
});
```

### Task 3: Use Google Search

```typescript
import { googleSearchTool } from "../tools/google-search";

// In agent instructions:
`When user asks to search, use googleSearchTool with query and maxResults`

// Or directly:
const result = await googleSearchTool.execute({
  context: { query: "latest AI news", maxResults: 5 }
});
```

### Task 4: Add Tool to Agent

```typescript
// 1. Import tool
import { myTool } from "../tools";

// 2. Add to agent tools object
const myAgent = new Agent({
  // ...
  tools: {
    myTool,
  },
});

// 3. Document in instructions
```

---

## Configuration Levels

### 1. Default
- Temperature: 0.7
- Max tokens: 8192
- Top K: 40
- Top P: 0.95

### 2. Conservative (More Deterministic)
- Temperature: 0.2
- Max tokens: 8192
- Top K: 10
- Top P: 0.9

### 3. Creative (More Diverse)
- Temperature: 1.0
- Max tokens: 8192
- Top K: 50
- Top P: 0.98

---

## API Models

| Model | Speed | Cost | Best For |
|-------|-------|------|----------|
| gemini-2.5-flash-lite | Fastest | Cheapest | Simple tasks |
| gemini-2.5-flash | Fast | Low | Most tasks (default) |
| gemini-2.5-pro | Slower | High | Complex reasoning |
| gemini-2.0-flash | Fast | Low | Legacy support |

---

## Debugging Checklist

- [ ] Environment variables set correctly
- [ ] GOOGLE_CREDENTIALS_JSON is valid JSON (single-line)
- [ ] GOOGLE_CLOUD_PROJECT is correct
- [ ] Dependencies installed (`pnpm install`)
- [ ] Database connection working
- [ ] Tools exported in index.ts
- [ ] Agent tools object has all required tools
- [ ] Agent model is `vertex("gemini-2.5-flash")`
- [ ] Memory configuration is correct
- [ ] Check logs for [Tool Name] prefix

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "GOOGLE_CLOUD_PROJECT is not configured" | Add GOOGLE_CLOUD_PROJECT to .env |
| "Invalid JSON in GOOGLE_CREDENTIALS_JSON" | Ensure single-line JSON with escaped \n |
| "Tool not found" | Check tools/index.ts exports |
| "undefined is not a function" | Verify tool import and export |
| "Memory not initialized" | Ensure Memory({ options: { ... } }) in agent |
| "Context validation failed" | Check input schema matches passed context |

---

## Performance Tips

1. **Use Flash model** - Fast + cheap, good enough for most tasks
2. **Cache search results** - Set TTL in config (30 min default)
3. **Limit maxResults** - Don't request 100+ results
4. **Batch operations** - Group multiple requests
5. **Monitor token usage** - Track in GCP Console
6. **Use conservative configs** for cost-sensitive tasks

---

## Folder Structure To Create

```bash
mkdir -p src/mastra/{agents,tools,lib}
mkdir -p src/server/{gemini,db}
mkdir -p src/types
```

---

## Cost Calculator

**Per 1M tokens:**
- Flash Input: $0.075
- Flash Output: $0.30
- Pro Input: $1.25
- Pro Output: $5.00

**Typical operations:**
- Web search: ~100 input tokens + ~500 output tokens
- Cost: ~$0.00004 per search (Flash model)
- 100 searches/day = ~$0.004/day = ~$0.12/month

---

## Useful Links (From WebSurfing)

- GitHub: https://github.com/vibesurfers/websurfing
- Google Vertex AI: https://cloud.google.com/vertex-ai
- Gemini API: https://ai.google.dev
- Mastra: https://mastra.ai
- Zod: https://zod.dev

---

## Next: Implementation Order

1. Create folder structure
2. Copy env.js and update variables
3. Copy vertex.ts provider
4. Copy Gemini client
5. Create .env file with your credentials
6. Test with simple tool
7. Create first agent
8. Add custom tools
9. Test end-to-end
10. Deploy to Vercel

---

See IMPLEMENTATION_GUIDE.md for detailed code templates.
