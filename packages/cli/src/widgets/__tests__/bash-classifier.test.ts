/**
 * Tests for bash-classifier.ts
 *
 * Covers yzT (write-like predicate), PzR (redirect/tee), $zR (path extraction),
 * and the integration with transformThreadToDisplayItems.
 *
 * 逆向: yzT at modules/1405_unknown_yzT.js
 * 逆向: IzR at modules/1403_unknown_IzR.js (PzR quick-check, tokenise, classify)
 * 逆向: $zR at modules/1406_unknown_$zR.js (sed/perl path extraction)
 * 逆向: Call site at chunk-004.js:7752-7787 (only sed/perl promoted to kind:edit)
 */

import { describe, expect, it } from "bun:test";
import { classifyBashCommand } from "../../util/bash-classifier";
import { type ToolItem, transformThreadToDisplayItems } from "../display-items";

// ─── classifyBashCommand unit tests ─────────────────────────────────────────

describe("classifyBashCommand — sed", () => {
  it("sed -i is write-like, program=sed", () => {
    const result = classifyBashCommand("sed -i 's/foo/bar/g' file.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("sed");
  });

  it("sed without -i is NOT write-like", () => {
    const result = classifyBashCommand("sed 's/foo/bar/g' file.txt");
    expect(result.isWriteLike).toBe(false);
  });

  it("sed --in-place is write-like", () => {
    const result = classifyBashCommand("sed --in-place 's/x/y/' file.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("sed");
  });

  it("sed -i.bak is write-like (startsWith -i)", () => {
    const result = classifyBashCommand("sed -i.bak 's/a/b/' file.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("sed");
  });

  it("sed -i extracts path from last non-flag arg", () => {
    // Two non-flag tokens: expression 's/foo/bar/g' and file path.txt
    const result = classifyBashCommand("sed -i 's/foo/bar/g' path.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.path).toBe("path.txt");
  });

  it("sed -i with only one non-flag arg has no path (just the expression)", () => {
    // Only one non-flag arg — amp's $zR returns undefined when < 2 non-flags
    const result = classifyBashCommand("sed -i 's/foo/bar/g'");
    expect(result.isWriteLike).toBe(true);
    expect(result.path).toBeUndefined();
  });

  it("sed -i with path prefix on binary is still classified correctly", () => {
    const result = classifyBashCommand("/usr/bin/sed -i 's/x/y/' out.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("sed");
    expect(result.path).toBe("out.txt");
  });
});

describe("classifyBashCommand — perl", () => {
  it("perl -pie is write-like, program=perl", () => {
    const result = classifyBashCommand("perl -pie 's/foo/bar/g' file.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("perl");
  });

  it("perl -pi is write-like", () => {
    const result = classifyBashCommand("perl -pi -e 's/a/b/' file.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("perl");
  });

  it("perl without -p[ie] flag is NOT write-like", () => {
    const result = classifyBashCommand("perl script.pl");
    expect(result.isWriteLike).toBe(false);
  });

  it("perl -e only (no -p) is NOT write-like", () => {
    const result = classifyBashCommand("perl -e 'print \"hi\"'");
    expect(result.isWriteLike).toBe(false);
  });

  it("perl -pie extracts path: last arg after skipping flags and -e expr", () => {
    // perl -pie 's/x/y/' file.txt → non-flag after flags: file.txt
    const result = classifyBashCommand("perl -pie 's/x/y/' target.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.path).toBe("target.txt");
  });

  it("perl -pi -e 's/x/y/' file.txt extracts path", () => {
    const result = classifyBashCommand("perl -pi -e 's/x/y/' file.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.path).toBe("file.txt");
  });
});

describe("classifyBashCommand — redirects and tee (PzR)", () => {
  it("redirect > is write-like", () => {
    const result = classifyBashCommand("echo hello > output.txt");
    expect(result.isWriteLike).toBe(true);
  });

  it("append >> is write-like", () => {
    const result = classifyBashCommand("echo hello >> output.txt");
    expect(result.isWriteLike).toBe(true);
  });

  it("pipe to tee is write-like", () => {
    const result = classifyBashCommand("ls | tee output.txt");
    expect(result.isWriteLike).toBe(true);
  });

  it("pipe to tee with space is write-like", () => {
    const result = classifyBashCommand("cat file.txt | tee copy.txt");
    expect(result.isWriteLike).toBe(true);
  });
});

describe("classifyBashCommand — read-only programs", () => {
  it("grep is NOT write-like", () => {
    const result = classifyBashCommand("grep pattern file.txt");
    expect(result.isWriteLike).toBe(false);
  });

  it("cat is NOT write-like", () => {
    const result = classifyBashCommand("cat file.txt");
    expect(result.isWriteLike).toBe(false);
  });

  it("ls is NOT write-like", () => {
    const result = classifyBashCommand("ls -la");
    expect(result.isWriteLike).toBe(false);
  });
});

describe("classifyBashCommand — find", () => {
  it("find -delete is write-like, program=find", () => {
    const result = classifyBashCommand("find . -name '*.tmp' -delete");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("find");
  });

  it("find without -delete (or other write flags) is NOT write-like", () => {
    const result = classifyBashCommand("find . -name '*.ts'");
    expect(result.isWriteLike).toBe(false);
  });

  it("find -exec is write-like", () => {
    const result = classifyBashCommand("find . -exec rm {} \\;");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("find");
  });
});

describe("classifyBashCommand — always-write programs (yzR)", () => {
  it("python is write-like", () => {
    const result = classifyBashCommand("python script.py");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("python");
  });

  it("node is write-like", () => {
    const result = classifyBashCommand("node build.js");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("node");
  });

  it("ruby is write-like", () => {
    const result = classifyBashCommand("ruby script.rb");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("ruby");
  });

  it("go is write-like", () => {
    const result = classifyBashCommand("go build ./...");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("go");
  });
});

describe("classifyBashCommand — edge cases", () => {
  it("empty string is NOT write-like", () => {
    const result = classifyBashCommand("");
    expect(result.isWriteLike).toBe(false);
  });

  it("env var assignment prefix is skipped", () => {
    const result = classifyBashCommand("FOO=bar sed -i 's/x/y/' f.txt");
    expect(result.isWriteLike).toBe(true);
    expect(result.program).toBe("sed");
  });

  it("sed in a pipeline (| sed) — first command grep is not write-like", () => {
    // We only classify the first command; the pipe boundary stops tokenisation
    const result = classifyBashCommand("grep foo file.txt | sed -i 's/foo/bar/' output.txt");
    // First command is grep — NOT write-like, but >> redirect check fires first
    // No redirect here, just a pipe, so PzR does not fire.
    // grep is the first command → not write-like.
    expect(result.isWriteLike).toBe(false);
    expect(result.program).toBe("grep");
  });
});

// ─── Integration: transformThreadToDisplayItems ──────────────────────────────

describe("transformThreadToDisplayItems — sed/perl promoted to kind:edit", () => {
  it("Bash tool with sed -i command produces ToolItem with kind='edit'", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_1",
            name: "Bash",
            input: { command: "sed -i 's/foo/bar/g' src/app.ts" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_1",
            run: { status: "done" as const, result: "" },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    const item = items[0] as ToolItem;
    expect(item.type).toBe("tool");
    expect(item.kind).toBe("edit");
    expect(item.toolName).toBe("Bash");
    expect(item.path).toBe("src/app.ts");
    expect(item.command).toBe("sed -i 's/foo/bar/g' src/app.ts");
  });

  it("Bash tool with perl -pie command produces ToolItem with kind='edit'", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_2",
            name: "Bash",
            input: { command: "perl -pie 's/old/new/g' config.json" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_2",
            run: { status: "done" as const, result: "" },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    const item = items[0] as ToolItem;
    expect(item.kind).toBe("edit");
    expect(item.path).toBe("config.json");
  });

  it("Bash tool with find -delete stays as kind='bash' (not promoted)", () => {
    // 逆向: chunk-004.js:7756 only promotes sed and perl to kind:edit
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_3",
            name: "Bash",
            input: { command: "find . -name '*.tmp' -delete" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_3",
            run: { status: "done" as const, result: "" },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    const item = items[0] as ToolItem;
    expect(item.kind).toBe("bash");
  });

  it("Bash tool with redirect > stays as kind='bash' (not promoted)", () => {
    // 逆向: chunk-004.js:7756 only promotes sed and perl to kind:edit
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_4",
            name: "Bash",
            input: { command: "echo hello > output.txt" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_4",
            run: { status: "done" as const, result: "" },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    const item = items[0] as ToolItem;
    expect(item.kind).toBe("bash");
  });

  it("Bash tool with plain ls command stays as kind='bash'", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_5",
            name: "Bash",
            input: { command: "ls -la" },
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_5",
            run: { status: "done" as const, result: "total 42" },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    const item = items[0] as ToolItem;
    expect(item.kind).toBe("bash");
    expect(item.output).toBe("total 42");
  });

  it("sed -i without extracted path falls back to command string as path", () => {
    // If $zR can't extract a path, amp falls back to `k.path ?? P` where P is the raw command
    // 逆向: chunk-004.js:7760: path: k.path ?? P
    const messages = [
      {
        role: "assistant" as const,
        content: [
          {
            type: "tool_use" as const,
            id: "tu_6",
            name: "Bash",
            input: { command: "sed -i 's/x/y/'" }, // no file arg → path undefined → fallback to command
            complete: true,
          },
        ],
        state: { type: "complete" as const },
      },
      {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            toolUseID: "tu_6",
            run: { status: "done" as const, result: "" },
          },
        ],
      },
    ];

    const items = transformThreadToDisplayItems(messages);
    expect(items).toHaveLength(1);
    const item = items[0] as ToolItem;
    expect(item.kind).toBe("edit");
    // path falls back to the raw command when $zR returns undefined
    expect(item.path).toBe("sed -i 's/x/y/'");
  });
});
