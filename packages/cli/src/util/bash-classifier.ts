/**
 * Bash command classifier for write-like detection.
 *
 * Matches amp's WO() / IzR() / yzT() / $zR() chain, scoped to the
 * write-like detection needed for promoting sed/perl Bash tool invocations
 * to kind: "edit" display items.
 *
 * 逆向: WO at modules/1402_unknown_WO.js (cache wrapper over IzR)
 * 逆向: IzR at modules/1403_unknown_IzR.js (full command classifier)
 * 逆向: yzT at modules/1405_unknown_yzT.js (write-like predicate)
 * 逆向: $zR at modules/1406_unknown_$zR.js (path extractor for sed/perl)
 * 逆向: PzR / kzR / yzR constants at chunk-005.js:146267
 */

// ─── Constants (逆向: chunk-005.js:146267) ──────────────────────────────────

/**
 * Programs that are always considered write-like regardless of flags.
 * 逆向: yzR = new Set(["python", "node", "ruby", "go"])
 */
const ALWAYS_WRITE_PROGRAMS = new Set(["python", "node", "ruby", "go"]);

/**
 * `find` flags that make it write-like.
 * 逆向: kzR = new Set(["-delete", "-exec", "-ok", "-execdir"])
 */
const FIND_WRITE_FLAGS = new Set(["-delete", "-exec", "-ok", "-execdir"]);

/**
 * Quick regex for redirect / pipe-to-tee patterns.
 * 逆向: PzR = /(\s|^)(>>?|\|\s*tee(\s|$))/
 */
const REDIRECT_REGEX = /(\s|^)(>>?|\|\s*tee(\s|$))/;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BashClassification {
  isWriteLike: boolean;
  program?: string;
  path?: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Simple tokenizer: splits on whitespace, respects single/double quotes,
 * stops at unquoted pipe `|`, redirect `>`, or command separator `;` / `&&` / `||`
 * since we only classify the first (leftmost) command.
 *
 * This intentionally avoids a full shell parser — amp's W5T/HO are the
 * real shell parser, but we only need a lightweight approximation for the
 * first command.
 *
 * 逆向: IzR uses W5T(HO(T, R)) for full AST parsing; we replicate the
 * subset needed for single-command, first-program classification.
 */
function tokenizeFirstCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let i = 0;
  const len = command.length;

  while (i < len) {
    const ch = command[i];

    // Unquoted quote — begin quoted segment
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < len && command[i] !== quote) {
        current += command[i];
        i++;
      }
      i++; // skip closing quote
      continue;
    }

    // Unquoted pipe or redirect or semicolon — stop (first command boundary)
    if (ch === "|" || ch === ">" || ch === ";" || ch === "&") {
      break;
    }

    // Unquoted whitespace — token boundary
    if (ch === " " || ch === "\t" || ch === "\n") {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Skip leading env-var assignments (FOO=bar) and return the program name.
 * Strip any path prefix (e.g. /usr/bin/sed → sed).
 *
 * 逆向: IzR uses vA(e.program) after W5T/HO parse to normalise the program name.
 */
function extractProgram(tokens: string[]): string | undefined {
  for (const token of tokens) {
    // Skip env-var assignments like FOO=bar
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) continue;
    // Strip path prefix
    const slash = token.lastIndexOf("/");
    return slash >= 0 ? token.slice(slash + 1) : token;
  }
  return undefined;
}

/**
 * Returns the args (everything after the program token).
 * 逆向: IzR uses qb(e) to get args from the parsed command node.
 */
function extractArgs(tokens: string[], program: string): string[] {
  // Find the program token index (skipping env assignments)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) continue;
    // This is the program token — args are everything after it
    return tokens.slice(i + 1);
  }
  return [];
}

/**
 * Check whether (program, args) is write-like.
 * 逆向: yzT at modules/1405_unknown_yzT.js
 */
function isWriteLike(program: string, args: string[]): boolean {
  // Always-write programs (python, node, ruby, go)
  if (ALWAYS_WRITE_PROGRAMS.has(program)) return true;
  // sed with -i or --in-place
  if (program === "sed" && args.some((a) => a.startsWith("-i") || a === "--in-place")) return true;
  // perl with -p[ie] flag
  if (program === "perl" && args.some((a) => /^-p[ie]/.test(a))) return true;
  // find with write-like action flags
  if (program === "find" && args.some((a) => FIND_WRITE_FLAGS.has(a))) return true;
  return false;
}

/**
 * Extract target file path for sed or perl.
 * 逆向: $zR at modules/1406_unknown_$zR.js
 *
 * sed: filter out flags (tokens starting with -), take last remaining
 *      if there are ≥2 non-flag tokens (first is the expression, last is the file).
 * perl: skip -e + its argument, skip all flags; first non-flag token is the
 *       script, then remaining tokens; return last token if ≥1.
 */
function extractPath(program: string, args: string[]): string | undefined {
  if (program === "sed") {
    const nonFlags = args.filter((r) => !r.startsWith("-"));
    return nonFlags.length >= 2 ? nonFlags[nonFlags.length - 1] : undefined;
  }

  if (program === "perl") {
    let i = 0;
    while (i < args.length) {
      const t = args[i];
      if (t === "-e") {
        // skip -e and its argument
        i += 2;
        continue;
      }
      if (t.startsWith("-")) {
        i++;
        continue;
      }
      break;
    }
    const remaining = args.slice(i);
    return remaining.length >= 1 ? remaining[remaining.length - 1] : undefined;
  }

  return undefined;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify a bash command string, returning whether it is write-like and,
 * for sed/perl, the target file path.
 *
 * Matches amp's IzR() + yzT() + $zR() logic, limited to the write-like
 * detection path used at chunk-004.js:7752-7787 (the Bash/shell_command branch
 * of yx0).
 *
 * 逆向: WO (1402_unknown_WO.js) → IzR (1403_unknown_IzR.js) → yzT (1405_unknown_yzT.js)
 *        → $zR (1406_unknown_$zR.js) for path extraction
 */
export function classifyBashCommand(command: string): BashClassification {
  // 1. Empty command
  if (!command) return { isWriteLike: false };

  // 2. Quick redirect / pipe-to-tee check — write-like, no program/path
  //    逆向: PzR.test(T) at IzR.js:6-9
  if (REDIRECT_REGEX.test(command)) return { isWriteLike: true };

  // 3. Tokenize the first command only
  const tokens = tokenizeFirstCommand(command);
  if (tokens.length === 0) return { isWriteLike: false };

  // 4. Extract program name
  const program = extractProgram(tokens);
  if (!program) return { isWriteLike: false };

  // 5. Extract args
  const args = extractArgs(tokens, program);

  // 6. Apply write-like predicate
  //    逆向: yzT at 1405_unknown_yzT.js
  if (!isWriteLike(program, args)) {
    return { isWriteLike: false, program };
  }

  // 7. Extract path for sed/perl
  //    逆向: $zR(t, r) at IzR.js:54 and 1406_unknown_$zR.js
  const path = extractPath(program, args);

  return { isWriteLike: true, program, path };
}
