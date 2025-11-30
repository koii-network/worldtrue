import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, FunctionDeclarationsTool } from "@google/generative-ai";
import { geocodeTool, createEventTool } from "@/lib/agent/tools";

const AGENT_INSTRUCTIONS = `You are WorldTrue Map Researcher, an AI agent that finds historical events and adds them to a world map.

WORKFLOW:
1. When asked about historical events, identify 3-5 key events
2. For EACH event, call geocode to get coordinates
3. Then call createEvent with the coordinates to add it to the map
4. After creating all events, summarize what you did

IMPORTANT:
- You MUST call createEvent for each event after geocoding
- Use the exact latitude/longitude from geocode results
- Always complete the full workflow: geocode → createEvent → summary

Example for "fall of Rome":
1. geocode("Rome, Italy") → get lat/lng
2. createEvent(title: "Sack of Rome by Visigoths", year: 410, latitude: 41.89, longitude: 12.48, ...)
3. Repeat for other events
4. Summarize: "I've created 3 events about the fall of Rome..."`;

// Tool execution helper
async function executeTool(toolName: string, args: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);
  if (toolName === "geocode") {
    return await geocodeTool.execute(args);
  } else if (toolName === "createEvent") {
    return await createEventTool.execute(args);
  }
  throw new Error(`Unknown tool: ${toolName}`);
}

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, conversation = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is required" }, { status: 400 });
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Define tools in Google's native format
    const tools: FunctionDeclarationsTool[] = [{
      functionDeclarations: [
        {
          name: "geocode",
          description: geocodeTool.description,
          parameters: geocodeTool.parameters as any,
        },
        {
          name: "createEvent",
          description: createEventTool.description,
          parameters: createEventTool.parameters as any,
        },
      ],
    }];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      tools,
      systemInstruction: AGENT_INSTRUCTIONS,
    });

    // Start chat with history
    const chat = model.startChat({
      history: conversation.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    });

    // Track all tool calls and created events
    const allToolCalls: Array<{ tool: string; args: any; result: any }> = [];
    const createdEvents: Array<any> = [];

    // Send initial message
    console.log("=== Starting agent conversation ===");
    console.log("Message:", message);

    let result = await chat.sendMessage(message);
    let response = result.response;

    // Handle tool calls in a loop (max 15 iterations for multiple events)
    let iterations = 0;
    const maxIterations = 15;

    while (iterations < maxIterations) {
      const functionCalls = response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        console.log("No more function calls, breaking loop");
        break;
      }

      iterations++;
      console.log(`=== Tool calling iteration ${iterations} ===`);
      console.log(`Found ${functionCalls.length} function call(s)`);

      // Execute all function calls
      const functionResponses = await Promise.all(
        functionCalls.map(async (call) => {
          console.log(`Calling ${call.name}:`, JSON.stringify(call.args));

          try {
            const toolResult = await executeTool(call.name, call.args);
            console.log(`${call.name} result:`, JSON.stringify(toolResult).substring(0, 200));

            // Track this tool call
            allToolCalls.push({
              tool: call.name,
              args: call.args,
              result: toolResult,
            });

            // If it's createEvent and succeeded, track the event
            if (call.name === "createEvent" && toolResult.success) {
              createdEvents.push(toolResult.event);
              console.log(`✓ Event created: ${toolResult.event?.title}`);
            }

            return {
              functionResponse: {
                name: call.name,
                response: toolResult,
              },
            };
          } catch (error: any) {
            console.error(`Tool ${call.name} failed:`, error.message);
            return {
              functionResponse: {
                name: call.name,
                response: { success: false, error: error.message },
              },
            };
          }
        })
      );

      // Send function responses back to model
      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    const responseText = response.text();
    console.log("=== Final results ===");
    console.log(`Tool calls: ${allToolCalls.length}`);
    console.log(`Created events: ${createdEvents.length}`);
    console.log(`Response length: ${responseText.length}`);

    return NextResponse.json({
      response: responseText,
      toolCalls: allToolCalls,
      createdEvents,
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    });
  } catch (error: any) {
    console.error("Agent API error:", error);

    if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key")) {
      return NextResponse.json(
        { error: "Invalid Gemini API key. Please check your key and try again." },
        { status: 401 }
      );
    }

    if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      return NextResponse.json(
        { error: "API rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
