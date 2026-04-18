import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { MemoryEntry, MemoryStoreData } from "./memory-types";

export class MemoryStore {
  private readonly filePath: string;
  private cache: MemoryEntry[] | null = null;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async list(): Promise<MemoryEntry[]> {
    await this.ensureLoaded();
    return [...this.cache!];
  }

  async get(key: string): Promise<MemoryEntry | null> {
    await this.ensureLoaded();
    return this.cache!.find((e) => e.key === key) ?? null;
  }

  async add(key: string, value: string, source?: string): Promise<void> {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const idx = this.cache!.findIndex((e) => e.key === key);
    if (idx >= 0) {
      this.cache![idx] = {
        ...this.cache![idx],
        value,
        updatedAt: now,
        source: source ?? this.cache![idx].source,
      };
    } else {
      this.cache!.push({ key, value, createdAt: now, updatedAt: now, source });
    }
    await this.save();
  }

  async remove(key: string): Promise<boolean> {
    await this.ensureLoaded();
    const idx = this.cache!.findIndex((e) => e.key === key);
    if (idx < 0) return false;
    this.cache!.splice(idx, 1);
    await this.save();
    return true;
  }

  async getSystemPromptBlock(): Promise<string> {
    const entries = await this.list();
    if (entries.length === 0) return "";
    const lines = entries.map((e) => `- [${e.key}] ${e.value}`);
    return `# User Memories\n\nThe following facts were saved by the user across previous sessions:\n\n${lines.join("\n")}\n`;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.cache !== null) return;
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const data: MemoryStoreData = JSON.parse(raw);
      if (data.version === 1 && Array.isArray(data.entries)) {
        this.cache = data.entries;
      } else {
        this.cache = [];
      }
    } catch {
      this.cache = [];
    }
  }

  private async save(): Promise<void> {
    const data: MemoryStoreData = { version: 1, entries: this.cache ?? [] };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = this.filePath + ".tmp";
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tmpPath, this.filePath);
  }
}
