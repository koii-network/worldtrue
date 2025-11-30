"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Key, Loader2, Bot, User, Sparkles, AlertCircle, Wand2, MessageSquare, MapPin, CheckCircle, Search, Cloud, CloudOff } from "lucide-react";
import ResearchPanel from "./ResearchPanel";
import { useSession } from "@/lib/auth-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: Array<{ tool: string; args: any }>;
  createdEvents?: Array<any>;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onEventsCreated?: () => void; // Callback to refresh map
  events: Array<{
    id: string;
    title: string;
    description: string;
    year: number;
    type: string;
  }>;
}

type PanelMode = "chat" | "agent" | "research";

export default function ChatPanel({ isOpen, onClose, onEventsCreated, events }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [isKeyLoading, setIsKeyLoading] = useState(true);
  const [isSyncedToCloud, setIsSyncedToCloud] = useState(false);
  const [mode, setMode] = useState<PanelMode>("research"); // Default to research mode
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { data: session } = useSession();

  // Load API key - from database if logged in, otherwise from localStorage
  useEffect(() => {
    const loadApiKey = async () => {
      setIsKeyLoading(true);

      // First, check localStorage for immediate loading
      const localKey = localStorage.getItem("gemini-api-key");

      // If logged in, try to fetch from database
      if (session?.user) {
        try {
          const response = await fetch("/api/settings");
          if (response.ok) {
            const data = await response.json();
            if (data.geminiApiKey) {
              // Database key takes precedence
              setApiKey(data.geminiApiKey);
              localStorage.setItem("gemini-api-key", data.geminiApiKey);
              setIsSyncedToCloud(true);
              setIsKeyLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("Failed to fetch API key from database:", err);
        }

        // If we have a local key but not in database, sync it up
        if (localKey) {
          setApiKey(localKey);
          // Sync local key to database
          try {
            await fetch("/api/settings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ geminiApiKey: localKey }),
            });
            setIsSyncedToCloud(true);
          } catch (err) {
            console.error("Failed to sync API key to database:", err);
          }
          setIsKeyLoading(false);
          return;
        }
      }

      // Fall back to localStorage only
      if (localKey) {
        setApiKey(localKey);
        setIsSyncedToCloud(false);
      } else {
        setShowApiKeyInput(true);
      }
      setIsKeyLoading(false);
    };

    loadApiKey();
  }, [session?.user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && apiKey && !showApiKeyInput) {
      inputRef.current?.focus();
    }
  }, [isOpen, apiKey, showApiKeyInput]);

  const saveApiKey = async () => {
    if (apiKey.trim()) {
      const trimmedKey = apiKey.trim();
      localStorage.setItem("gemini-api-key", trimmedKey);
      setKeySaved(true);
      setError(null);

      // If logged in, also save to database for cross-device sync
      if (session?.user) {
        try {
          await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ geminiApiKey: trimmedKey }),
          });
          setIsSyncedToCloud(true);
        } catch (err) {
          console.error("Failed to sync API key to database:", err);
          setIsSyncedToCloud(false);
        }
      }

      // Auto-hide after showing success
      setTimeout(() => {
        setShowApiKeyInput(false);
        setKeySaved(false);
      }, 1500);
    }
  };

  const clearApiKey = async () => {
    localStorage.removeItem("gemini-api-key");
    setApiKey("");
    setShowApiKeyInput(true);
    setIsSyncedToCloud(false);

    // If logged in, also clear from database
    if (session?.user) {
      try {
        await fetch("/api/settings", { method: "DELETE" });
      } catch (err) {
        console.error("Failed to clear API key from database:", err);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !apiKey || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = mode === "agent" ? "/api/agent" : "/api/chat";
      const requestBody = mode === "agent"
        ? {
            message: userMessage.content,
            apiKey,
            conversation: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }
        : {
            message: userMessage.content,
            apiKey,
            eventsContext: events.slice(0, 20),
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        toolCalls: data.toolCalls,
        createdEvents: data.createdEvents,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If events were created, notify parent to refresh map
      if (data.createdEvents && data.createdEvents.length > 0 && onEventsCreated) {
        onEventsCreated();
      }
    } catch (err: any) {
      setError(err.message);
      if (err.message.includes("API key")) {
        setShowApiKeyInput(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 md:w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col">
      {/* Mobile swipe indicator */}
      <div className="md:hidden flex justify-center py-2 border-b border-gray-800/50">
        <div className="w-12 h-1 bg-gray-700 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {mode === "research" ? (
            <Search className="w-5 h-5 text-purple-400" />
          ) : mode === "agent" ? (
            <Wand2 className="w-5 h-5 text-purple-400" />
          ) : (
            <Sparkles className="w-5 h-5 text-purple-400" />
          )}
          <span className="font-medium text-white">
            {mode === "research" ? "AI Research" : mode === "agent" ? "Event Researcher" : "WorldTrue Assistant"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setMode("chat")}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${
                mode === "chat"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              title="Chat Mode"
            >
              Chat
            </button>
            <button
              onClick={() => setMode("agent")}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${
                mode === "agent"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              title="Agent Mode"
            >
              Agent
            </button>
            <button
              onClick={() => setMode("research")}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${
                mode === "research"
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              title="Research Mode"
            >
              Research
            </button>
          </div>
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className={`p-1.5 rounded-lg transition-colors relative ${
              showApiKeyInput
                ? "bg-purple-500/20 text-purple-400"
                : apiKey
                  ? "text-green-500 hover:text-green-400"
                  : "text-gray-500 hover:text-gray-300"
            }`}
            title={
              apiKey
                ? isSyncedToCloud
                  ? "API Key Synced to Cloud ☁️"
                  : "API Key Saved (Local Only)"
                : "API Key Settings"
            }
          >
            {apiKey && !showApiKeyInput ? (
              <div className="relative">
                <CheckCircle className="w-4 h-4" />
                {isSyncedToCloud && (
                  <Cloud className="w-2.5 h-2.5 absolute -top-1 -right-1 text-blue-400" />
                )}
              </div>
            ) : (
              <Key className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* API Key Section */}
      {showApiKeyInput && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-800/50">
          {keySaved ? (
            <div className="flex items-center gap-2 text-green-400 py-2">
              <CheckCircle className="w-5 h-5" />
              <div>
                <span className="text-sm font-medium">API key saved!</span>
                {session?.user && (
                  <span className="flex items-center gap-1 text-xs text-blue-400 mt-0.5">
                    <Cloud className="w-3 h-3" />
                    Synced across devices
                  </span>
                )}
              </div>
            </div>
          ) : (
            <>
              <label className="block text-xs text-gray-400 mb-2">
                Enter your Gemini API key
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-purple-400 hover:text-purple-300"
                >
                  (Get one free)
                </a>
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
                />
                <button
                  onClick={saveApiKey}
                  disabled={!apiKey.trim()}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                {apiKey && (
                  <button
                    onClick={clearApiKey}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear saved key
                  </button>
                )}
                {session?.user ? (
                  <span className="flex items-center gap-1 text-xs text-blue-400 ml-auto">
                    <Cloud className="w-3 h-3" />
                    Will sync across devices
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                    <CloudOff className="w-3 h-3" />
                    Login to sync across devices
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Research Panel */}
      {mode === "research" ? (
        <div className="flex-1 overflow-y-auto">
          {isKeyLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : (
            <ResearchPanel apiKey={apiKey} onEventsCreated={onEventsCreated} />
          )}
        </div>
      ) : (
        <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isKeyLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : (
          <>
            {messages.length === 0 && !showApiKeyInput && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-4">
                  {mode === "agent"
                    ? "Ask me to find and map historical events!"
                    : "Ask me anything about historical events!"}
                </p>
                <div className="space-y-2 text-left">
                  <p className="text-xs text-gray-600">Try asking:</p>
                  {(mode === "agent" ? [
                    "Find events about the fall of Rome",
                    "Map technological discoveries in the 1900s",
                    "Show me cultural events in Paris during the 1920s",
                  ] : [
                    "What happened in ancient Rome?",
                    "Tell me about events in 1789",
                    "What discoveries were made in the Americas?",
                  ]).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-400 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  {mode === "agent" ? <Wand2 className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>

            {/* Show tool calls if in agent mode */}
            {message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0 && (
              <div className="ml-11 mt-2 space-y-1">
                {message.toolCalls.map((call, idx) => (
                  <div key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>Used {call.tool} tool</span>
                  </div>
                ))}
              </div>
            )}

            {/* Show created events */}
            {message.role === "assistant" && message.createdEvents && message.createdEvents.length > 0 && (
              <div className="ml-11 mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Created {message.createdEvents.length} event(s) on the map</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !apiKey
                ? "Enter API key first"
                : mode === "agent"
                ? "Ask me to find and map events..."
                : "Ask about history..."
            }
            disabled={!apiKey || isLoading}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || !apiKey || isLoading}
            className="p-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-xl transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Powered by Gemini. Your API key is stored locally.
        </p>
      </div>
      </>
      )}
    </div>
  );
}
