/**
 * @flitter/agent-core — ApplyPatchTool tests
 *
 * Tests the Codex patch format parser and hunk applicator.
 * 逆向: test cases derived from amp's Z5R examples in
 *   amp-cli-reversed/modules/2026_tail_anonymous.js:139877-140010
 */
import { describe, expect, it } from "bun:test";
import { applyHunks, type PatchChunk, parsePatch } from "./apply-patch";

// ─── Parser Tests ───────────────────────────────────────────

describe("parsePatch", () => {
  it("parses Add File operation", () => {
    const patch = `*** Begin Patch
*** Add File: path/to/new/file.ts
+const hello = 'world'
+export { hello }
*** End Patch`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("add");
    expect(result.operations[0].path).toBe("path/to/new/file.ts");
    expect(result.operations[0].contents).toBe("const hello = 'world'\nexport { hello }\n");
  });

  it("parses Delete File operation", () => {
    const patch = `*** Begin Patch
*** Delete File: path/to/delete.ts
*** End Patch`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("delete");
    expect(result.operations[0].path).toBe("path/to/delete.ts");
  });

  it("parses simple Update File with context", () => {
    const patch = `*** Begin Patch
*** Update File: src/utils/helpers.ts
@@
 export function processData(input: string) {
   const normalized = input.trim()
   if (!normalized) {
     return 'default'
   }
-  return normalized
+  return normalized.toLowerCase()
 }
*** End Patch`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0];
    expect(op.type).toBe("update");
    expect(op.path).toBe("src/utils/helpers.ts");
    expect(op.chunks).toHaveLength(1);
    expect(op.chunks![0].oldLines).toContain("  return normalized");
    expect(op.chunks![0].newLines).toContain("  return normalized.toLowerCase()");
  });

  it("parses Update with @@ class context", () => {
    const patch = `*** Begin Patch
*** Update File: src/services/user-service.ts
@@ class UserService
   constructor(
     private readonly repo: UserRepo,
     private readonly logger: Logger,
   ) {}

   async updateUser(id: string, data: UserData) {
     const user = await this.findById(id)
-    user.name = data.name
+    user.name = data.name?.trim() || user.name
+    user.updatedAt = new Date()
     await this.save(user)
     return user
   }
 }
*** End Patch`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    const chunk = result.operations[0].chunks![0];
    expect(chunk.changeContext).toBe("class UserService");
  });

  it("parses multiple @@ blocks to skip intervening code", () => {
    const patch = `*** Begin Patch
*** Update File: src/config/settings.ts
@@
 const defaultConfig = {
   name: 'myapp',
   version: '1.0.0',
   featureFlags: {
     metrics: true,
     tracing: false,
   },
@@
   logging: {
     destination: 'stdout',
-    level: 'info',
+    level: 'debug',
     format: 'json',
     redact: ['token'],
   },
   retries: 3,
*** End Patch`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    // The multiple @@ blocks should produce chunks that can be located
    expect(result.operations[0].chunks!.length).toBeGreaterThanOrEqual(1);
  });

  it("parses Update with Move to", () => {
    const patch = `*** Begin Patch
*** Update File: src/old-name.ts
*** Move to: src/new-name.ts
@@
-export function oldName() {
+export function newName() {
   return 'hello'
 }
*** End Patch`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0];
    expect(op.type).toBe("update");
    expect(op.path).toBe("src/old-name.ts");
    expect(op.movePath).toBe("src/new-name.ts");
  });

  it("parses multi-file patch", () => {
    const patch = `*** Begin Patch
*** Add File: src/new.ts
+export const x = 1
*** Delete File: src/old.ts
*** Update File: src/main.ts
@@
-const old = require('./old')
+const x = require('./new')
*** End Patch`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(3);
    expect(result.operations[0].type).toBe("add");
    expect(result.operations[1].type).toBe("delete");
    expect(result.operations[2].type).toBe("update");
  });

  it("throws on missing markers", () => {
    expect(() => parsePatch("just some text")).toThrow("missing *** Begin Patch");
  });

  it("throws on missing End Patch", () => {
    expect(() => parsePatch("*** Begin Patch\n*** Add File: a.ts\n+x")).toThrow(
      "missing *** End Patch",
    );
  });

  it("throws on End before Begin", () => {
    expect(() => parsePatch("*** End Patch\n*** Begin Patch")).toThrow(
      "*** End Patch appears before",
    );
  });

  it("returns warnings for content outside markers", () => {
    const patch = `some preamble
*** Begin Patch
*** Delete File: a.ts
*** End Patch
trailing content`;

    const result = parsePatch(patch);
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("strips heredoc wrapper", () => {
    const patch = `cat <<'EOF'
*** Begin Patch
*** Delete File: a.ts
*** End Patch
EOF`;

    const result = parsePatch(patch);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].type).toBe("delete");
  });

  it("parses End of File marker", () => {
    const patch = `*** Begin Patch
*** Update File: src/config.ts
@@
 last line
-old last
+new last
*** End of File
*** End Patch`;

    const result = parsePatch(patch);
    const chunk = result.operations[0].chunks![0];
    expect(chunk.isEndOfFile).toBe(true);
  });
});

// ─── Hunk Applicator Tests ──────────────────────────────────

describe("applyHunks", () => {
  it("applies a single exact-match hunk", () => {
    const content = `line1
line2
line3
line4
line5
`;
    const chunks: PatchChunk[] = [
      {
        oldLines: ["line2", "line3"],
        newLines: ["line2", "line3_modified"],
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toBe("line1\nline2\nline3_modified\nline4\nline5\n");
  });

  it("applies insert-only hunk", () => {
    const content = "line1\nline2\n";
    const chunks: PatchChunk[] = [
      {
        oldLines: [],
        newLines: ["inserted"],
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toContain("inserted");
  });

  it("applies delete-only hunk (old lines, no new lines)", () => {
    const content = "line1\nline2\nline3\n";
    const chunks: PatchChunk[] = [
      {
        oldLines: ["line2"],
        newLines: [],
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toBe("line1\nline3\n");
  });

  it("applies multiple hunks in order", () => {
    const content = `function a() {
  return 1
}

function b() {
  return 2
}
`;
    const chunks: PatchChunk[] = [
      {
        oldLines: ["  return 1"],
        newLines: ["  return 10"],
      },
      {
        oldLines: ["  return 2"],
        newLines: ["  return 20"],
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toContain("return 10");
    expect(result.content).toContain("return 20");
  });

  it("uses @@ changeContext to position hunk", () => {
    const content = `class Foo {
  getValue() { return 1 }
}

class Bar {
  getValue() { return 2 }
}
`;
    const chunks: PatchChunk[] = [
      {
        oldLines: ["  getValue() { return 2 }"],
        newLines: ["  getValue() { return 42 }"],
        changeContext: "class Bar",
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toContain("return 1"); // Foo unchanged
    expect(result.content).toContain("return 42"); // Bar changed
    expect(result.content).not.toContain("return 2");
  });

  it("handles End of File anchor", () => {
    const content = `first
middle
last
`;
    const chunks: PatchChunk[] = [
      {
        oldLines: ["last"],
        newLines: ["last", "appended"],
        isEndOfFile: true,
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toBe("first\nmiddle\nlast\nappended\n");
  });

  it("preserves CRLF line endings", () => {
    const content = "line1\r\nline2\r\nline3\r\n";
    const chunks: PatchChunk[] = [
      {
        oldLines: ["line2"],
        newLines: ["modified"],
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toBe("line1\r\nmodified\r\nline3\r\n");
  });

  it("fuzzy matches with trailing whitespace (rstrip tier)", () => {
    const content = "line1  \nline2  \nline3  \n";
    const chunks: PatchChunk[] = [
      {
        oldLines: ["line2"],
        newLines: ["modified"],
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content).toContain("modified");
  });

  it("throws on no match", () => {
    const content = "line1\nline2\n";
    const chunks: PatchChunk[] = [
      {
        oldLines: ["nonexistent"],
        newLines: ["replacement"],
      },
    ];

    expect(() => applyHunks("test.ts", content, chunks)).toThrow("Could not find matching lines");
  });

  it("throws on overlapping hunks", () => {
    const content = "a\nb\nc\nd\ne\n";
    const chunks: PatchChunk[] = [
      {
        oldLines: ["b", "c", "d"],
        newLines: ["B", "C", "D"],
      },
      {
        oldLines: ["c", "d"],
        newLines: ["X", "Y"],
      },
    ];

    // The second hunk's old lines overlap with the first hunk's range
    // After first hunk matches b-d, cursor advances past d.
    // Second hunk tries to match c-d but cursor is past them.
    // It won't find c-d after cursor, so this throws "Could not find matching lines"
    expect(() => applyHunks("test.ts", content, chunks)).toThrow();
  });

  it("ensures trailing newline", () => {
    const content = "line1\nline2";
    const chunks: PatchChunk[] = [
      {
        oldLines: ["line2"],
        newLines: ["modified"],
      },
    ];

    const result = applyHunks("test.ts", content, chunks);
    expect(result.content.endsWith("\n")).toBe(true);
  });
});

// ─── Integration: parsePatch + applyHunks ───────────────────

describe("parsePatch + applyHunks integration", () => {
  it("handles amp example: simple update with context", () => {
    const fileContent = `export function processData(input: string) {
  const normalized = input.trim()
  if (!normalized) {
    return 'default'
  }
  return normalized
}

export function formatLabel(label: string) {
  return label.toUpperCase()
}
`;

    const patch = `*** Begin Patch
*** Update File: src/utils/helpers.ts
@@
 export function processData(input: string) {
   const normalized = input.trim()
   if (!normalized) {
     return 'default'
   }
-  return normalized
+  return normalized.toLowerCase()
 }

 export function formatLabel(label: string) {
   return label.toUpperCase()
 }
*** End Patch`;

    const parsed = parsePatch(patch);
    expect(parsed.operations).toHaveLength(1);
    const op = parsed.operations[0];
    expect(op.type).toBe("update");

    const result = applyHunks("helpers.ts", fileContent, op.chunks!);
    expect(result.content).toContain("return normalized.toLowerCase()");
    expect(result.content).not.toContain("  return normalized\n");
  });

  it("handles amp example: large file with 5+ context lines", () => {
    const fileContent = `export const buttonTokens = {
  primary: {
    background: colors.blue[500],
    foreground: colors.white,
    border: colors.blue[600],
    hoverBackground: colors.blue[600],
    activeBackground: colors.blue[700],
    focusRing: colors.blue[300],
    disabledBackground: colors.gray[300],
    disabledForeground: colors.gray[500],
  },
  secondary: {
    background: colors.gray[200],
  },
}
`;

    const patch = `*** Begin Patch
*** Update File: src/theme/button-tokens.ts
@@ export const buttonTokens = {
   primary: {
     background: colors.blue[500],
     foreground: colors.white,
     border: colors.blue[600],
     hoverBackground: colors.blue[600],
     activeBackground: colors.blue[700],
-    focusRing: colors.blue[300],
+    focusRing: colors.cyan[300],
     disabledBackground: colors.gray[300],
     disabledForeground: colors.gray[500],
   },
   secondary: {
*** End Patch`;

    const parsed = parsePatch(patch);
    const result = applyHunks("button-tokens.ts", fileContent, parsed.operations[0].chunks!);
    expect(result.content).toContain("focusRing: colors.cyan[300]");
    expect(result.content).not.toContain("focusRing: colors.blue[300]");
  });
});
