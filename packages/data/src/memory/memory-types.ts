export interface MemoryEntry {
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

export interface MemoryStoreData {
  version: 1;
  entries: MemoryEntry[];
}
