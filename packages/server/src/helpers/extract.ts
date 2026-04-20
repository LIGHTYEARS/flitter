/**
 * @flitter/server — Snapshot field extraction
 *
 * Extracts index columns and FTS content from a ThreadSnapshot
 * without depending on @flitter/data. This is a server-side
 * reimplementation of the essential logic from snapshotToEntry().
 */
import type { ThreadSnapshot } from "@flitter/schemas";

export interface ExtractedFields {
  id: string;
  v: number;
  title: string | null;
  createdAt: number;
  updatedAt: number;
  userLastInteractedAt: number;
  messageCount: number;
  agentMode: string | null;
  archived: boolean;
  visibility: string;
  /** Concatenated text from all messages (for FTS indexing) */
  ftsContent: string;
  labels: string[];
}

/**
 * Extract indexable fields + FTS content from a ThreadSnapshot.
 *
 * 逆向: fuT() in amp-cli-reversed/app/skills-agents-system.js
 * computes ThreadEntry from a thread object. We replicate the
 * essential fields here for server-side indexing.
 */
export function extractFields(snapshot: ThreadSnapshot): ExtractedFields {
  // Extract text content from all messages for FTS
  const textParts: string[] = [];
  let messageCount = 0;

  for (const msg of snapshot.messages) {
    if (msg.role === "user" || msg.role === "assistant") {
      messageCount++;
    }
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type === "text" && "text" in block) {
        textParts.push((block as { text: string }).text);
      }
    }
  }

  // Compute userLastInteractedAt: max of created time and user message sentAt timestamps
  // 逆向: fuT() — Math.max(thread.created, ...userMessages.map(m => m.meta?.sentAt))
  const created = ((snapshot as Record<string, unknown>).created as number | undefined) ?? 0;
  const sentTimes: number[] = [];
  for (const msg of snapshot.messages) {
    if (msg.role === "user" && msg.meta && typeof msg.meta === "object") {
      const sentAt = (msg.meta as Record<string, unknown>).sentAt;
      if (typeof sentAt === "number") {
        sentTimes.push(sentAt);
      }
    }
  }
  const userLastInteractedAt = Math.max(created, ...sentTimes, 0);

  const meta = snapshot.meta as Record<string, unknown> | undefined;
  const visibility = (meta?.visibility as string) ?? "private";

  return {
    id: snapshot.id,
    v: snapshot.v,
    title: snapshot.title ?? null,
    createdAt: created,
    updatedAt: Date.now(),
    userLastInteractedAt,
    messageCount,
    agentMode: snapshot.agentMode ?? null,
    archived: !!(snapshot as Record<string, unknown>).archived,
    visibility,
    ftsContent: textParts.join("\n").slice(0, 100_000), // Cap FTS content at 100KB
    labels: ((snapshot as Record<string, unknown>).labels as string[]) ?? [],
  };
}
