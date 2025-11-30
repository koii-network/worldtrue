import { openDB, DBSchema, IDBPDatabase } from "idb";
import { KnowledgeStore } from "./historical-research-agent";

export interface WebSource {
  url: string;
  title: string;
  snippet: string;
  scrapedContent?: string;
  relevanceScore: number;
  citedInEvents: string[];
}

export interface ResearchSession {
  id: string;
  query: string;
  topic: string;
  depth: "quick" | "medium" | "deep";
  knowledge: KnowledgeStore;
  webSources: WebSource[];
  createdAt: number;
  status: "researching" | "completed" | "failed";
  apiCost?: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
}

interface KnowledgeStoreDB extends DBSchema {
  researchSessions: {
    key: string;
    value: ResearchSession;
    indexes: { "by-topic": string; "by-date": number };
  };
}

export class ClientKnowledgeStore {
  private db: IDBPDatabase<KnowledgeStoreDB> | null = null;
  private initPromise: Promise<void> | null = null;

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.db = await openDB<KnowledgeStoreDB>("worldtrue-knowledge", 1, {
        upgrade(db) {
          const store = db.createObjectStore("researchSessions", {
            keyPath: "id",
          });
          store.createIndex("by-topic", "topic");
          store.createIndex("by-date", "createdAt");
        },
      });
    })();

    return this.initPromise;
  }

  private ensureInitialized() {
    if (!this.db) {
      throw new Error(
        "ClientKnowledgeStore not initialized. Call init() first."
      );
    }
  }

  async saveSession(session: ResearchSession) {
    this.ensureInitialized();
    await this.db!.put("researchSessions", session);
  }

  async getSession(id: string): Promise<ResearchSession | undefined> {
    this.ensureInitialized();
    return await this.db!.get("researchSessions", id);
  }

  async getAllSessions(): Promise<ResearchSession[]> {
    this.ensureInitialized();
    return await this.db!.getAll("researchSessions");
  }

  async getSessionsByTopic(topic: string): Promise<ResearchSession[]> {
    this.ensureInitialized();
    return await this.db!.getAllFromIndex("researchSessions", "by-topic", topic);
  }

  async deleteSession(id: string) {
    this.ensureInitialized();
    await this.db!.delete("researchSessions", id);
  }

  async clearAll() {
    this.ensureInitialized();
    await this.db!.clear("researchSessions");
  }

  // Sync to server when user confirms
  async syncToServer(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const response = await fetch("/api/knowledge-store/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });

    if (!response.ok) {
      throw new Error("Failed to sync session to server");
    }

    return response.json();
  }
}
