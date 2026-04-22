/**
 * Thread Search DSL Parser
 *
 * 逆向: chunk-005.js:147050-147104 (iGR spec)
 *   The amp find_thread DSL is parsed server-side; flitter implements local parsing
 *   to support local-only operation. The DSL specification is extracted from the
 *   amp tool description at chunk-005.js:147059-147070.
 *
 * DSL syntax (case-insensitive matching):
 *   - Bare words / quoted phrases → keyword text search
 *   - file:path → threads that touched a file (partial match)
 *   - repo:url  → scope to a repository (partial match)
 *   - author:name → threads by a user; author:me for own threads
 *   - after:date / before:date → ISO dates or relative (7d, 2w)
 *   - is:archived → filter by archived status
 *   - label:name → filter by label
 *   - All filters combine with implicit AND
 *
 * Date formats (逆向: chunk-005.js:147070):
 *   "ISO dates (2024-01-15), relative days (7d), or weeks (2w)"
 */

export interface ThreadSearchQuery {
  keywords: string[];
  file?: string;
  repo?: string;
  author?: string;
  after?: Date;
  before?: Date;
  isArchived?: boolean;
  label?: string;
}

/** Known filter key names. Unknown key:value tokens fall through as keywords. */
const KNOWN_KEYS = new Set(["file", "repo", "author", "after", "before", "is", "label"]);

/**
 * Parse a relative date string into an absolute Date.
 *
 * Supported formats:
 *   - "7d"  → 7 days ago
 *   - "2w"  → 14 days ago (2 * 7)
 *   - "2024-01-15" → ISO date
 *
 * Returns null if the string cannot be parsed.
 *
 * 逆向: chunk-005.js:147070 — "ISO dates (2024-01-15), relative days (7d), or weeks (2w)"
 */
export function parseDate(value: string): Date | null {
  // Relative days: "7d"
  const daysMatch = /^(\d+)d$/i.exec(value);
  if (daysMatch) {
    const days = Number(daysMatch[1]);
    if (Number.isNaN(days)) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Relative weeks: "2w"
  const weeksMatch = /^(\d+)w$/i.exec(value);
  if (weeksMatch) {
    const weeks = Number(weeksMatch[1]);
    if (Number.isNaN(weeks)) return null;
    const d = new Date();
    d.setDate(d.getDate() - weeks * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ISO date: "2024-01-15"
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (isoMatch) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  return null;
}

/**
 * Tokenize a query string, respecting double-quoted phrases.
 *
 * 逆向: chunk-005.js:147061 — `"race condition"` as a quoted phrase
 *
 * Examples:
 *   '"hello world" foo' → ["hello world", "foo"]
 *   'auth "race condition"' → ["auth", "race condition"]
 */
function tokenize(raw: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = raw.length;

  while (i < len) {
    // Skip leading whitespace
    while (i < len && /\s/.test(raw[i]!)) i++;
    if (i >= len) break;

    if (raw[i] === '"') {
      // Quoted phrase: collect until closing "
      const start = i + 1;
      i++;
      while (i < len && raw[i] !== '"') i++;
      const phrase = raw.slice(start, i);
      if (i < len) i++; // consume closing "
      if (phrase.length > 0) tokens.push(phrase);
    } else {
      // Bare token: collect until whitespace
      const start = i;
      while (i < len && !/\s/.test(raw[i]!)) i++;
      tokens.push(raw.slice(start, i));
    }
  }

  return tokens;
}

/**
 * Parse a raw query string into a structured ThreadSearchQuery.
 *
 * 逆向: chunk-005.js:147059-147070 (amp find_thread DSL spec)
 *
 * Rules:
 * 1. Split on whitespace, respecting quoted phrases
 * 2. For each token, check if it matches key:value pattern
 * 3. Known keys: file, repo, author, after, before, is, label
 * 4. Unknown key:value tokens are treated as keywords (pass through)
 * 5. Everything else goes into keywords array
 */
export function parseThreadQuery(raw: string): ThreadSearchQuery {
  const query: ThreadSearchQuery = { keywords: [] };

  if (!raw || raw.trim().length === 0) {
    return query;
  }

  const tokens = tokenize(raw.trim());

  for (const token of tokens) {
    const colonIdx = token.indexOf(":");
    if (colonIdx > 0) {
      const key = token.slice(0, colonIdx).toLowerCase();
      const value = token.slice(colonIdx + 1);

      if (KNOWN_KEYS.has(key) && value.length > 0) {
        switch (key) {
          case "file":
            query.file = value;
            break;
          case "repo":
            query.repo = value;
            break;
          case "author":
            query.author = value;
            break;
          case "after": {
            const d = parseDate(value);
            if (d !== null) query.after = d;
            else query.keywords.push(token); // unparseable → treat as keyword
            break;
          }
          case "before": {
            const d = parseDate(value);
            if (d !== null) query.before = d;
            else query.keywords.push(token); // unparseable → treat as keyword
            break;
          }
          case "is":
            if (value.toLowerCase() === "archived") {
              query.isArchived = true;
            } else {
              // Unknown is:X → keyword
              query.keywords.push(token);
            }
            break;
          case "label":
            query.label = value;
            break;
        }
        continue;
      }
    }

    // Not a filter token (or unknown key) → keyword
    query.keywords.push(token);
  }

  return query;
}
