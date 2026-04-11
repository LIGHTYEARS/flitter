// Module: tool-execution-engine
// Original: segment1[809229:897791]
// Type: Scope-hoisted
// Exports: cwR, swR, nwR, AwR, NI, kmT, xmT, WWT, bwR, mwR, uwR, ywR, PwR, kwR, xwR, fwR, _, IwR, gwR, $wR
// Category: cli

, enumerate the deliverables, give it step by step procedures and ways to validate the results.Also give it constraints(e.g.coding style) and include relevant context snippets or examples.

# # # Oracle

  -
  Senior engineering advisor with GPT - 5.4 reasoning model
for reviews, architecture, deep debugging, and
planning. -
  Use
for: Code reviews, architecture decisions, performance analysis, complex debugging, planning Task Tool runs
  -
  Don 't use for: Simple file searches, bulk code execution -
  Prompt it with a precise problem description and attach necessary files or code.Ask
for a concrete outcomes and request trade - off analysis.Use the reasoning power it has.

# # # Codebase Search

  -
  Smart code explorer that locates logic based on conceptual descriptions across languages / layers. -
  Use
for: Mapping features, tracking capabilities, finding side - effects by concept -
  Don 't use for: Code changes, design advice, simple exact text searches -
  Prompt it with the real world behavior you are tracking.Give it hints with keywords, file types or directories.Specifiy a desired output format.

You should follow the following best practices:
  -Workflow: Oracle(plan) \u2192 Codebase Search(validate scope) \u2192 Task Tool(execute) -
  Scope: Always constrain directories, file patterns, acceptance criteria -
  Prompts: Many small, explicit requests > one giant ambiguous one

# Quality Bar(code) -
  Match style of recent code in the same subsystem. -
  Small, cohesive diffs;
prefer a single file
if viable. -
  Strong typing, explicit error paths, predictable I / O. -
  No`as any\` or linter suppression unless explicitly requested.
- Add/adjust minimal tests if adjacent coverage exists; follow patterns.
- Reuse existing interfaces/schemas; don\u2019t duplicate.

# Verification Gates (must run)

Order: Typecheck \u2192 Lint \u2192 Tests \u2192 Build.
- Use commands from \`${ka}\` or neighbors; if unknown, search the repo.
- Report evidence concisely in the final status (counts, pass/fail).
- If unrelated pre-existing failures block you, say so and scope your change.

# Handling Ambiguity
- Search code/docs before asking.
- If a decision is needed (new dep, cross-cut refactor), present 2\u20133 options with a recommendation. Wait for approval.

# Markdown Formatting Rules (strict) for your responses.

ALL YOUR RESPONSES SHOULD FOLLOW THIS MARKDOWN FORMAT:

- Bullets: use hyphens \`-\` only.
- Numbered lists: only when steps are procedural; otherwise use \`-\`.
- Headings: \`#\`, \`##\` sections, \`###\` subsections; don\u2019t skip levels.
- Code fences: always add a language tag (\`ts\`, \`tsx\`, \`js\`, \`json\`, \`bash\`, \`python\`); no indentation.
- Inline code: wrap in backticks; escape as needed.
- Links: every file name you mention must be a \`file://\` link with exact line(s) when applicable.
- No emojis, minimal exclamation points, no decorative symbols.

Prefer "fluent" linking style. That is, don't show the user the actual URL, but instead use it to add links to relevant pieces of your response. Whenever you mention a file by name, you MUST link to it in this way. Examples:
- The [\`extractAPIToken\` function](file:///Users/george/projects/webserver/auth.js#L158) examines request headers and returns the caller's auth token for further validation.
- According to [PR #3250](https://github.com/sourcegraph/amp/pull/3250), this feature was implemented to solve reported failures in the syncing service.
- [Configure the JWT secret](file:///Users/alice/project/config/auth.js#L15-L23) in the configuration file
- [Add middleware validation](file:///Users/alice/project/middleware/auth.js#L45-L67) to check tokens on protected routes

When you write to \`.md\` files, you should use the standard Markdown spec.

# Avoid Over-Engineering
- Local guard > cross-layer refactor.
- Single-purpose util > new abstraction layer.
- Don\u2019t introduce patterns not used by this repo.

# Conventions & Repo Knowledge
- Treat ${ka} as ground truth for commands, style, structure.
- If you discover a recurring command that\u2019s missing there, ask to append it.

# Output & Links
- Only use code blocks for patches/snippets\u2014not for status.
- Every file you mention in the final status must use a \`file://\` link with exact line(s).
- When writing to README files or similar documentation, use workspace-relative file paths instead of absolute paths when referring to workspace files. For example, use \`docs/file.md\` instead of \`/Users/username/repos/project/docs/file.md\`.

# Final Status Spec (strict)

2\u201310 lines. Lead with what changed and why. Link files with \`file://\` + line(s). Include verification results (e.g., \u201C148/148 pass\u201D). Offer the next action. Write in the markdown style outliend above.
Example:
Fixed auth crash in [\`auth.js\`](file:///workspace/auth.js#L42) by guarding undefined user. \`npm test\` passes 148/148. Build clean. Ready to merge?

# Working Examples

## Small bugfix request
- Search narrowly for the symbol/route; read the defining file and closest neighbor only.
- Apply the smallest fix; prefer early-return/guard.
- Run typecheck/lint/tests/build. Report counts. Stop.

## \u201CExplain how X works\u201D
- Concept search + targeted reads (limit: 4 files, 800 lines).
- Answer directly with a short paragraph or a list if procedural.
- Don\u2019t propose code unless asked.

## \u201CImplement feature Y\u201D
- Brief plan (3\u20136 steps). If >3 files/subsystems \u2192 show plan before edits.
- Scope by directories and globs; reuse existing interfaces & patterns.
- Implement in incremental patches, each compiling/green.
- Run gates; add minimal tests if adjacent.

# Strict Concision (default)
- Be concise. Respond in the fewest words that fully update the user on what you have done or doing.
- Never pad with meta commentary.

# Amp Manual
- When asked about Amp (models, pricing, features, configuration, capabilities), read https://ampcode.com/manual and answer based on that page.
`
}

function cwR() {
  return ""
}

function swR({
  enableTaskList: T = !1
} = {}) {
  return `You are Amp, a powerful AI coding agent, optimized for speed and efficiency.

# Agency

- **SPEED FIRST**: You are a fast and highly parallelizable agent. You should minimize thinking time, minimize tokens, maximize action.
- Balance initiative with restraint: if the user asks a question, answer it; don't edit files.
- You have the capability to output any number of tool calls in a single response. If you anticipate making multiple non-interfering tool calls, you are HIGHLY RECOMMENDED to make them in parallel to significantly improve efficiency and do not limit to 3-4 only tool calls. This is very important to your performance.

# Tool Usages

- Prefer specialized tools over ${U8} for better user experience. For example, ${y8} for reading files, ${ke} for edits, ${v0T} to revert.
- Before using ${U8}, check the Environment section (OS, shell, working directory) and tailor commands and flags to that environment.
- Before running lint/typecheck/build commands, confirm the script exists in the relevant package.json (e.g., verify \`"lint"\` exists before running \`pnpm run lint\`).
- Always read the file immediately before using ${ke} to ensure you have the latest content. Do NOT run multiple edits to the same file in parallel.
- When using ${y8}, prefer reading larger ranges (200+ lines) or the full file. Avoid repeated small chunk reads (e.g., 50 lines at a time).
- When using file system tools (such as ${y8}, ${ke}, ${Wt}, etc.), always use absolute file paths, not relative paths. Use the workspace root folder paths in the Environment section to construct absolute paths.
${T?`- Use ${db} only for complex, multi-step tasks that benefit from structured tracking. Most tasks are simple and should not require task list usage. Mark tasks \`in_progress\` when starting, \`completed\` when done. Use \`ready: true\` to find unblocked tasks.
`:""}

# ${ka} file

Relevant ${ka} files will be automatically added to your context to help you understand:
- Frequently used commands (typecheck, lint, build, test, etc.) so you can use them without searching next time
- The user's preferences for code style, naming conventions, etc.
- Codebase structure and organization

# Conventions & Rules

When making changes to files, first understand the file's code conventions. Mimic code style, use existing libraries and utilities, and follow existing patterns.
- NEVER assume that a given library is available, even if it is well known. Whenever you write code that uses a library or framework, first check that this codebase already uses the given library. For example, you might look at neighboring files, or check the package.json (or cargo.toml, and so on depending on the language).
- When you edit a piece of code, first look at the code's surrounding context (especially its imports) to understand the code's choice of frameworks and libraries. Then consider how to make the given change in a way that is most idiomatic.
- Keep import style consistent with the surrounding codebase (order, grouping, and placement).
- Redaction markers like [REDACTED:amp-token] or [REDACTED:github-pat] indicate the original file or message contained a secret which has been redacted by a low-level security system. Take care when handling such data, as the original file will still contain the secret which you do not have access to. Ensure you do not overwrite secrets with a redaction marker, and do not use redaction markers as context when using tools like ${ke} as they will not match the file.
- Do not suppress compiler, typechecker, or linter errors (e.g., with \`as any\` or \`// @ts-expect-error\` in TypeScript) in your final code unless the user explicitly asks you to.
- NEVER use background processes with the \`&\` operator in shell commands. Background processes will not continue running and may confuse users. If long-running processes are needed, instruct the user to run them manually outside of Amp.
- Never add comments to explain code changes. Only add comments when requested or required for complex code.

# Git and workspace hygiene
- You may be in a dirty git worktree.
	 * Only revert existing changes if the user explicitly requests it; otherwise leave them intact.
    * If asked to make a commit or code edits and there are unrelated changes to your work or changes that you didn't make in those files, don't revert those changes.
    * If the changes are in files you've touched recently, you should read carefully and understand how you can work with the changes rather than reverting them.
    * If the changes are in unrelated files, just ignore them and don't revert them.
- Do not amend commits unless explicitly requested.
- **NEVER** use destructive commands like \`git reset --hard\` or \`git checkout --\` unless specifically requested or approved by the user.

# Communication
- **ULTRA CONCISE**. Answer in 1-3 words when possible. One line maximum for simple questions.
- For code tasks: do the work, minimal or no explanation. Let the code speak.
- For questions: answer directly, no preamble or summary.

## Citations
- Link files as: [display text](file:///absolute/path#L10-L20)
`
}

function nwR({
  enableDiagnostics: T
}) {
  return `You are Amp (Rush Mode), optimized for speed and efficiency.

# Core Rules

**SPEED FIRST**: Minimize thinking time, minimize tokens, maximize action. You are here to execute, so: execute.

# Execution

Do the task with minimal explanation:
- Use ${ja} and ${ht} extensively in parallel to understand code
- Make edits with ${ke} or ${Wt}
- After changes, MUST verify with ${T?`${YS} or `:""}build/test/lint commands via ${U8}
- NEVER make changes without then verifying they work

# Communication Style

**ULTRA CONCISE**. Answer in 1-3 words when possible. One line maximum for simple questions.

<example>
<user>what's the time complexity?</user>
<response>O(n)</response>
</example>

<example>
<user>how do I run tests?</user>
<response>\`pnpm test\`</response>
</example>

<example>
<user>fix this bug</user>
<response>[uses ${y8} and ${ht} in parallel, then ${ke}, then ${U8}]
Fixed.</response>
</example>

For code tasks: do the work, minimal or no explanation. Let the code speak.

For questions: answer directly, no preamble or summary.

# Tool Usage

When invoking ${y8}, ALWAYS use absolute paths.

Read complete files, not line ranges. Do NOT invoke ${y8} on the same file twice.

Run independent read-only tools (${ht}, ${ja}, ${y8}, ${hN}) in parallel.

Do NOT run multiple edits to the same file in parallel.

# AGENTS.md

If an ${ka} is provided, treat it as ground truth for commands and structure.

# File Links

Link files as: [display text](file:///absolute/path#L10-L20)

Always link when mentioning files.

# Final Note

Speed is the priority. Skip explanations unless asked. Keep responses under 2 lines except when doing actual work.`
}

function AwR(T) {
  return `You are ${T?.specialAgentName||"Amp"}, a powerful AI coding agent.

When invoking the Read tool, ALWAYS use absolute paths.

When reading a file, read the complete file, not specific line ranges.

If you've already used the Read tool read an entire file, do NOT invoke Read on that file again.

If ${ka} exists, treat it as ground truth for commands, style, structure. If you discover a recurring command that's missing, ask to append it there.

For any coding task that involves thoroughly searching or understanding the codebase, use the finder tool to intelligently locate relevant code, functions, or patterns. This helps in understanding existing implementations, locating dependencies, or finding similar code before making changes.

`
}
async function NI(T) {
  let R = new TextEncoder().encode(T),
    a = await crypto.subtle.digest("SHA-256", R);
  return Array.from(new Uint8Array(a)).map((e) => e.toString(16).padStart(2, "0")).join("").slice(0, 16)
}
async function kmT(T, R, a, e, t) {
  let r = {
    basePrompt: await NI(T)
  };
  for (let [h, i] of R.entries()) r[`contextBlock_${h}`] = await NI(i.text);
  for (let [h, i] of a.entries()) r[`additionalBlock_${h}`] = await NI(i.text);
  for (let [h, i] of e.entries()) r[`finalBlock_${h}`] = await NI(i.text);
  return r.tools = await NI(JSON.stringify(t.map((h) => h.name))), r
}

function xmT(T, R, a, e) {
  let t = cM.get(T);
  if (!t) {
    J.debug("System prompt build complete (first build)", {
      threadId: T,
      ...e
    }), cM.set(T, R);
    return
  }
  let r = {},
    h = {},
    i = new Set([...Object.keys(t), ...Object.keys(R)]);
  for (let c of i) {
    let s = t[c],
      A = R[c];
    if (s !== A) {
      if (r[c] = {
          old: s ?? "missing",
          new: A ?? "missing"
        }, c === "basePrompt") h[c] = a.basePrompt;
      else if (c === "tools") h[c] = a.tools.map((l) => l.name);
      else if (c.startsWith("contextBlock_")) {
        let l = c.split("_")[1];
        if (l) {
          let o = Number.parseInt(l, 10);
          h[c] = a.contextComponents[o]?.text
        }
      } else if (c.startsWith("additionalBlock_")) {
        let l = c.split("_")[1];
        if (l) {
          let o = Number.parseInt(l, 10);
          h[c] = a.additionalComponents[o]?.text
        }
      } else if (c.startsWith("finalBlock_")) {
        let l = c.split("_")[1];
        if (l) {
          let o = Number.parseInt(l, 10);
          h[c] = a.finalBlocks[o]?.text
        }
      }
    }
  }
  if (Object.keys(r).length > 0) {
    let c = Object.keys(r);
    J.debug("System prompt build complete (CHANGES DETECTED)", {
      threadId: T,
      ...e,
      changedKeys: c,
      changedValues: h
    }), cM.set(T, R)
  } else J.debug("System prompt build complete (no changes)", {
    threadId: T
  })
}
async function WWT(T, R, a) {
  let e = R.trees?.[0]?.uri,
    t = R.trees?.[0]?.uri ?? e,
    r = await (async () => {
      if (!e) return null;
      return BWT(Ht(e), a, T.filesystem, {
        workingDirectory: t ? Ht(t) : void 0
      })
    })();
  return {
    workspaceRoot: e,
    workingDirectory: t,
    rootDirectoryListing: r
  }
}
async function bwR(T, R) {
  if (!R) return null;
  let a = MR.joinPath(Ht(R), ...LwR.split("/"));
  try {
    return await T.stat(a), Kt(a)
  } catch (e) {
    if (e instanceof ur) return null;
    return J.warn("Failed to resolve preview instructions file", {
      error: e,
      previewInstructionsURI: a.toString()
    }), null
  }
}
async function mwR(T, R) {
  let a = await bwR(T, R);
  return ["Sandbox preview URLs: The user cannot open sandbox-local URLs directly, so never tell them to use raw localhost or 127.0.0.1 for sandbox web servers.", "Only share a preview URL when this environment or repo explicitly provides how to derive one.", a ? `This repo has preview instructions at \`${a}\`; read that file and follow it before sharing a preview URL, and do not invent a URL pattern.` : "If the repo has a `.agents/preview` file, read it and follow it. Otherwise, say that you do not have a configured preview URL instead of guessing.", "When you do have a preview URL, hyperlink it."].join(" ")
}

function uwR(T) {
  if (!T || !X9(T)) return [];
  let {
    user: R
  } = T;
  return [{
    type: "text",
    text: ["# Signed-In User", ...R.username ? [`- Amp username: ${R.username}`] : [], ...R.githubLogin ? [`- Connected GitHub login: @${R.githubLogin}`] : ["- No stored GitHub identity is currently known."], ...R.slackUserID ? [`- Connected Slack user ID: ${R.slackUserID}`] : ["- No stored Slack identity is currently known."]].join(`
`)
  }]
}

function ywR(T) {
  for (let R = T.length - 1; R >= 0; R -= 1) {
    let a = T[R];
    if (!a || a.role !== "user") continue;
    let e = a.userState?.aggmanContext?.availableProjects;
    if (!e || e.length === 0) continue;
    let t = [],
      r = new Set;
    for (let h of e) {
      let i = h.name.trim(),
        c = h.repositoryURL.trim();
      if (!i || !c) continue;
      let s = `${i}\x00${c}`;
      if (r.has(s)) continue;
      if (r.add(s), t.push({
          name: i,
          repositoryURL: c
        }), t.length >= 50) break
    }
    if (t.length > 0) return t
  }
  return []
}

function PwR(T) {
  let R = T.trim().replace(/\.git$/i, "");
  try {
    let a = new URL(R),
      e = a.pathname.replace(/^\/+/, "");
    return e.length > 0 ? e : a.host
  } catch {
    return R
  }
}

function kwR(T) {
  let R = ywR(T);
  if (R.length === 0) return [];
  return [{
    type: "text",
    text: ["# Workspace Projects", ...R.map((a) => {
      let e = PwR(a.repositoryURL),
        t = e === a.repositoryURL ? e : `${e} (${a.repositoryURL})`;
      return `- ${a.name}: ${t}`
    })].join(`
`)
  }]
}

function xwR(T, R) {
  return [...uwR(R), ...kwR(T.messages)]
}
async function fwR({
  configService: T,
  getThreadEnvironment: R,
  ...a
}, e, t, r) {
  let h = t === "deep",
    i = e.env?.initial ?? await R(r);
  r?.throwIfAborted();
  let c = await T.getLatest(r);
  r?.throwIfAborted();
  let s = await WWT({
    filesystem: a.filesystem
  }, i, e.id);
  r?.throwIfAborted();
  let A = [],
    l = await _O({
      ...a,
      configService: T
    }, e, r);
  r?.throwIfAborted();
  let o = l.filter((u) => u.type !== "subtree");
  A.push({
    type: "text",
    text: h ? EwR : dwR
  });
  let n = JS().os === "windows" ? "\\" : "/",
    p = (await Promise.all(o.map(async (u) => {
      try {
        let P = await a.filesystem.readFile(Ht(u.uri), {
            signal: r
          }),
          k = Mr(u.uri),
          x = Mr(MR.dirname(u.uri)),
          f;
        if (h) f = `# AGENTS.md instructions for ${x}

<INSTRUCTIONS>
${P}
</INSTRUCTIONS>`;
        else {
          let v = a7T(u.uri),
            g;
          if (u.type === "subtree") g = `Contents of ${k} (directory-specific instructions for ${x}${n}):`;
          else g = `Contents of ${k} (${v}):`;
          f = `${g}

<instructions>
${P}
</instructions>`
        }
        return {
          type: "text",
          text: f
        }
      } catch (P) {
        return J.error("Error reading guidance file content", {
          uri: u.uri,
          error: P
        }), null
      }
    }))).filter((u) => u !== null);
  if (h) {
    let u = 0,
      P = [];
    for (let k of p) {
      let x = new TextEncoder().encode(k.text).length;
      if (u + x > 32768) {
        J.warn("AGENTS.md guidance budget exceeded, truncating remaining files", {
          totalBytes: u,
          budgetBytes: 32768,
          includedBlocks: P.length,
          droppedBlocks: p.length - P.length
        });
        break
      }
      P.push(k), u += x
    }
    A.push(...P)
  } else A.push(...p);

  function _(u) {
    if (!u.trees || u.trees.length === 0) return null;
    let P = u.trees.map((k) => k.repository?.url).filter((k) => k !== void 0);
    if (P.length === 0) return null;
    return `${o9(P.length,"Repository","Repositories")}: ${P.join(", ")}`
  }
  let m;
  try {
    m = new URL(c.settings.url?.replace(/\/$/, "") ?? "https://ampcode.com")
  } catch (u) {
    J.error("Error parsing Amp URL", {
      error: u
    })
  }
  A.push({
    type: "text",
    text: ["# Environment", "Here is useful information about the environment you are running in:", `Today's date: ${new Date().toDateString()}`, `Working directory: ${s.workingDirectory?Kt(s.workingDirectory):"(none)"}`, `Workspace root: ${s.workspaceRoot?Kt(s.workspaceRoot):"(none)"}`, e.meta?.executorType === "sandbox" ? zWT : null, i && i.platform ? `Operating system: ${i.platform.os} (${i.platform.osVersion})${i.platform.cpuArchitecture?` on ${i.platform.cpuArchitecture}`:""}${i.platform.os==="windows"?" (use Windows file paths with backslashes)":""}${i.platform.webBrowser?" (running in web browser)":""}` : null, i ? _(i) : null, m ? `Amp Thread URL: ${$P(m,e.id)}` : null, e.meta?.executorType === "sandbox" ? CwR : null, e.meta?.executorType === "sandbox" ? await mwR(a.filesystem, s.workspaceRoot) : null, !h && s.rootDirectoryListing ? `## Directory listing
List of files (top-level only) in the user's workspace:
${s.rootDirectoryListing}
` : null].filter((u) => u !== null).join(`

`)
  });
  let b = await a.skillService.getSkills();
  r?.throwIfAborted();
  let y = h ? zkR(b) : qkR(b);
  if (y) A.push({
    type: "text",
    text: y
  });
  return {
    blocks: A
  }
}

function IwR(T) {
  if (!T || !X9(T)) return !1;
  return T.features.some((R) => R.name === dr.TASK_LIST && R.enabled)
}

function gwR(T) {
  if (!T || !X9(T)) return !1;
  return T.features.some((R) => R.name === dr.HARNESS_SYSTEM_PROMPT && R.enabled) || Ns(T.user.email)
}

function $wR(T) {
  if (T.name === "gpt-5-codex") return "gpt-5-codex";
  if (T.name.includes("kimi-k2")) return "kimi";
  if (T.provider === "openai") return "gpt";
  if (T.provider === "xai") return "xai";
  if (T.provider === "vertexai") return "gemini";
  return "default"
}

function vwR(T, R) {
  if (T.includes("gpt-5-codex")) return "gpt-5-codex";
  if (T.includes("kimi-k2")) return "kimi";
  if (T.includes("gpt")) return "gpt";
  if (R === "xai") return "xai";
  if (R === "vertexai") return "gemini";
  return "default"
}

function jwR({
  agentMode: T,
  model: R,
  provider: a
}) {
  if (T === L0T) return "aggman";
  if (qt(T)) return "free";
  if (T === "rush") return "rush";
  if (T === "deep") return "deep";
  if (JET(T)) return "internal";
  let e = dn(`${a}/${R}`);
  if (e) return $wR(e);
  return vwR(R, a)
}
async function LO(T, R, {
  enableTaskList: a,
  enableTask: e,
  enableOracle: t,
  enableDiagnostics: r,
  enableChart: h = !0
}, {
  model: i,
  provider: c,
  agentMode: s
}, A) {
  if (IwR(T.serverStatus)) a = !0;
  let l = Boolean(R.mainThreadID),
    o = await m0(l ? T.toolService.getToolsForMode(s, l) : T.toolService.getTools(s), A),
    n = await Promise.all(o.filter(({
      enabled: I
    }) => I).filter(({
      spec: I
    }) => a || I.name !== db).filter(({
      spec: I
    }) => e || I.name !== Dt).filter(({
      spec: I
    }) => t || I.name !== tt).filter(({
      spec: I
    }) => h || I.name !== $D).map(async ({
      spec: I
    }) => {
      if (I.name === oc) return w7R(I, T.skillService);
      return I
    }));
  if (c === "openai") {
    let I = new Set(R.activatedSkills?.map((S) => S.name) ?? []);
    if (I.size > 0) {
      let S = new Set(n.map((j) => j.name));
      for (let [j, d] of Object.entries(s7T))
        if (I.has(d) && !S.has(j)) {
          let C = T.toolService.getToolSpec(j);
          if (C) n.push(C), S.add(j)
        }
      let O = await m0(T.toolService.tools, A);
      for (let {
          spec: j,
          enabled: d
        }
        of O) {
        if (!d) continue;
        if (j.meta?.deferred !== !0) continue;
        if (typeof j.source !== "object" || !("mcp" in j.source)) continue;
        let C = j.meta?.skillNames ?? [];
        if (C.length === 0) continue;
        if (!C.some((L) => I.has(L))) continue;
        if (S.has(j.name)) continue;
        n.push(j), S.add(j.name)
      }
    }
  }
  a = n.some((I) => I.name === db), e = n.some((I) => I.name === Dt), t = n.some((I) => I.name === tt), r = n.some((I) => I.name === YS), h = n.some((I) => I.name === $D);
  let p = await T.configService.getLatest(),
    _ = p.settings["experimental.autoSnapshot"] ?? !1,
    m = gwR(T.serverStatus) ? p.settings.systemPrompt : void 0,
    b = qt(s),
    y = jwR({
      agentMode: s,
      model: i,
      provider: c
    }),
    u;
  switch (y) {
    case "aggman":
      u = V7R();
      break;
    case "free":
      u = TwR();
      break;
    case "rush":
      u = nwR({
        enableDiagnostics: r
      });
      break;
    case "gpt":
      u = twR();
      break;
    case "gpt-5-codex":
      u = hwR();
      break;
    case "deep":
      u = Y7R();
      break;
    case "internal":
      u = cwR();
      break;
    case "xai":
      u = AwR();
      break;
    case "kimi":
      u = swR({
        enableTaskList: a
      });
      break;
    case "gemini":
      u = awR({
        enableOracle: t,
        enableDiagnostics: r
      });
      break;
    default:
      u = Z7R({
        enableTaskList: a,
        enableTask: e,
        enableOracle: t,
        enableDiagnostics: r,
        enableAutoSnapshot: _,
        enableChart: h
      });
      break
  }
  if (m) u = m;
  let P = [];
  if (y !== "aggman") P = (await fwR(T, R, s, A)).blocks;
  else P = xwR(R, T.serverStatus);
  let k = [];
  if (y === "default") k.push({
    type: "text",
    text: OwR
  });
  let x = [{
      type: "text",
      text: u,
      cache_control: {
        type: "ephemeral",
        ttl: "1h"
      }
    }, ...P, ...s7(k, "1h")],
    f = null,
    v = p.settings["internal.scaffoldCustomizationFile"];
  if (v) try {
    let I = await T.filesystem.readFile(zR.file(v), {
        signal: A
      }),
      S = SX.default.parse(I);
    f = W7R(S)
  }
  catch {
    let I = {
        systemPrompt: {
          type: "replaceAll",
          value: x.map(({
            text: O
          }) => O)
        },
        enableToolSpecs: n.map(({
          name: O
        }) => ({
          name: O
        })),
        disableTools: []
      },
      S = SX.default.stringify(I, {
        lineWidth: 0,
        blockQuote: "literal"
      });
    await (T.writeFile ?? SwR)(v, S)
  }
  if (f) {
    let I = f ? q7R(n, f) : n,
      S = x;
    if (f.systemPrompt) {
      let j = (typeof f.systemPrompt.value === "string" ? [f.systemPrompt.value] : f.systemPrompt.value).map((d) => ({
        type: "text",
        text: d
      }));
      switch (f.systemPrompt.type) {
        case "replaceAll":
          S = j;
          break;
        case "replaceBase":
          S = [...j, ...P, ...k];
          break
      }
    }
    let O = await kmT(u, P, k, S, I);
    return xmT(R.id, O, {
      basePrompt: u,
      contextComponents: P,
      additionalComponents: k,
      finalBlocks: S,
      tools: I
    }, {
      model: i,
      provider: c,
      agentMode: s,
      isFreeMode: b,
      basePromptType: y,
      enableTask: e,
      enableOracle: t,
      enableDiagnostics: r,
      hasScaffoldCustomization: !0,
      scaffoldCustomizationType: f.systemPrompt?.type
    }), {
      systemPrompt: s7(S),
      tools: I
    }
  }
  let g = await kmT(u, P, k, x, n);
  return xmT(R.id, g, {
    basePrompt: u,
    contextComponents: P,
    additionalComponents: k,
    finalBlocks: x,
    tools: n
  }, {
    model: i,
    provider: c,
    agentMode: s,
    isFreeMode: b,
    basePromptType: y,
    enableTask: e,
    enableOracle: t,
    enableDiagnostics: r,
    hasScaffoldCustomization: !1,
    scaffoldCustomizationType: void 0
  }), {
    systemPrompt: x,
    tools: n
  }
}
async function SwR(T, R) {
  await _wR(T, R, "utf8"), J.info("Created scaffold customization file", {
    file: T
  })
}

function MwR(T, R, a) {
  let e = a.getExecutionProfile(T.name),
    t = a.getExecutionProfile(R.name);
  if (!e || !t) return !0;
  if (e.serial || t.serial) return !0;
  let r = e.resourceKeys(T.input ?? {}),
    h = t.resourceKeys(R.input ?? {});
  for (let i of r)
    for (let c of h)
      if (i.key === c.key) {
        if (i.mode === "write" || c.mode === "write") return !0
      }
  return !1
}

function DwR(T, R, a) {
  for (let e of R)
    if (MwR(T, e, a)) return !0;
  return !1
}

function wwR(T, R) {
  if (T.length === 0) return [];
  let a = [],
    e = [];
  for (let t of T) {
    if (DwR(t, e, R)) {
      if (e.length > 0) a.push(e), e = []
    }
    e.push(t)
  }
  if (e.length > 0) a.push(e);
  return a
}
class FWT {
  threadID;
  toolService;
  callbacks;
  processingMutex = new Cm;
  runningTools = new Map;
  cancelledToolUses = new Set;
  toolMessages = new Map;
  toolCompletionResolvers = new Map;
  pendingApprovalsSubscription;
  writtenBlockedToolUseIds = new Set;
  disposed = !1;
  constructor(T, R, a) {
    this.threadID = T, this.toolService = R, this.callbacks = a, this.pendingApprovalsSubscription = this.toolService.pendingApprovals$.subscribe((e) => {
      this.syncPendingApprovalsToThreadState(e)
    })
  }
  syncPendingApprovalsToThreadState(T) {
    let R = T.filter((e) => e.threadId === this.threadID);
    for (let e of R)
      if (!this.writtenBlockedToolUseIds.has(e.toolUseId)) this.writtenBlockedToolUseIds.add(e.toolUseId), J.debug("Writing blocked-on-user to thread state", {
        name: "syncPendingApprovalsToThreadState",
        threadID: this.threadID,
        toolUseId: e.toolUseId,
        toolName: e.toolName
      }), this.callbacks.updateThread({
        type: "tool:data",
        toolUse: e.toolUseId,
        data: {
          status: "blocked-on-user",
          reason: e.reason,
          toAllow: e.toAllow
        }
      });
    let a = new Set(R.map((e) => e.toolUseId));
    for (let e of this.writtenBlockedToolUseIds)
      if (!a.has(e)) this.writtenBlockedToolUseIds.delete(e)
  }
  async onResume() {
    await this.processingMutex.acquire();
    try {
      let T = this.callbacks.getThread(),
        R = dt(T, "user");
      if (!R) return;
      for (let a of R.content) {
        if (a.type !== "tool_result") continue;
        if (a.run.status === "blocked-on-user") {
          let t = this.findToolUseById(a.toolUseID);
          if (!t) continue;
          J.debug(`restoring blocked-on-user tool ${t.name} to approval queue`, {
            name: "onResume",
            threadID: this.threadID,
            toolUseID: a.toolUseID
          }), this.toolService.restoreApproval({
            threadId: this.threadID,
            toolUseId: a.toolUseID,
            toolName: t.name,
            args: t.input ?? {},
            reason: a.run.reason,
            toAllow: a.run.toAllow,
            context: T.mainThreadID ? "subagent" : "thread"
          });
          continue
        }
        if (!(!wt(a.run.status) && !this.runningTools.has(a.toolUseID))) continue;
        let e = this.findToolUseById(a.toolUseID);
        if (!e) continue;
        if (this.isDangerousToResume(e.name)) {
          J.debug(`cancelling dangerous tool ${e.name} on resume`, {
            name: "onResume",
            threadID: this.threadID,
            toolUseID: a.toolUseID
          });
          let t = FD(a.run);
          this.callbacks.updateThread({
            type: "tool:data",
            toolUse: a.toolUseID,
            data: {
              status: "cancelled",
              reason: "system:safety",
              progress: t
            }
          });
          continue
        }
        J.debug(`re-invoking tool ${e.name} with ID ${a.toolUseID}`, {
          name: "onResume",
          threadID: this.threadID
        }), await this.invokeTool(e, a.userInput)
      }
    } finally {
      this.processingMutex.release()
    }
    await this.callbacks.updateFileChanges()
  }
  async onAssistantMessageComplete(T) {
    let R;
    await this.processingMutex.acquire();
    try {
      this.cancelledToolUses.clear(), R = this.findToolUsesNeedingInvocation(T), J.debug(`saw ${R.length} tool uses (${R.map((a)=>a.name).join(", ")})`, {
        name: "onAssistantMessageComplete",
        threadID: this.threadID
      })
    } finally {
      this.processingMutex.release()
    }
    if (R.length > 0) await this.executeToolsWithPlan(R)
  }
  async userProvideInput(T, R) {
    await this.processingMutex.acquire();
    try {
      let a = this.findToolUseById(T);
      if (a && Va(a)) await this.invokeTool(a, R)
    } finally {
      this.processingMutex.release()
    }
  }
  async userCancel(T) {
    await this.cancelTool(T, "user:cancelled")
  }
  async onNewUserMessage() {
    this.markAllActiveToolsCancelled(), this.toolService.clearApprovalsForThread(this.threadID), await this.cancelAll("user:interrupted")
  }
  async cancelAll(T) {
    await this.processingMutex.acquire();
    try {
      this.markAllActiveToolsCancelled(), this.toolService.clearApprovalsForThread(this.threadID), this.cancelUnstartedTools(T), await this.cancelInProgressTools(T)
    } finally {
      this.processingMutex.release()
    }
  }
  async findAndCancelToolRun(T, R) {
    let a = this.callbacks.getThread();
    if (!Tn(a, T)) return;
    await this.cancelTool(T, "user:cancelled", R)
  }
  async cancelToolOnly(T, R) {
    let a = this.callbacks.getThread();
    if (!Tn(a, T)) return;
    let e = this.getCancelDataForToolRun(T, "user:cancelled"),
      t = this.toolMessages.get(T);
    if (t) {
      try {
        t.next({
          type: "stop-command"
        })
      } catch (r) {
        J.warn("Failed to send stop-command", {
          toolUseID: T,
          error: r
        })
      }
      t.complete(), this.toolMessages.delete(T)
    }
    J.debug(`cancelToolOnly(${T})`), await this.callbacks.handle({
      type: "tool:data",
      toolUse: T,
      data: e
    }, R)
  }
  getRunningToolIds() {
    return Array.from(this.runningTools.keys())
  }
  hasRunningTools() {
    return this.runningTools.size > 0
  }
  isCancelled(T) {
    return this.cancelledToolUses.has(T)
  }
  markCancelled(T) {
    this.cancelledToolUses.add(T)
  }
  clearCancelled(T) {
    this.cancelledToolUses.delete(T)
  }
  sendToolMessage(T, R) {
    let a = this.toolMessages.get(T);
    if (a) return a.next(R), !0;
    return !1
  }
  resolveToolCompletion(T, R, a) {
    let e = this.toolCompletionResolvers.get(T);
    if (e) {
      if (R) e.resolve();
      else e.reject(a ?? Error(`Tool failed: ${T}`));
      this.toolCompletionResolvers.delete(T)
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = !0, this.pendingApprovalsSubscription.unsubscribe(), this.toolService.clearApprovalsForThread(this.threadID), this.writtenBlockedToolUseIds.clear();
    for (let [T, R] of this.toolCompletionResolvers) try {
      R.reject(Error("Orchestrator disposed"))
    }
    finally {
      this.toolCompletionResolvers.delete(T)
    }
    for (let [T, R] of this.toolMessages) try {
      R.next({
        type: "stop-command"
      }), R.complete()
    }
    catch (a) {
      J.warn("Failed to cleanup tool messages during disposal", {
        id: T,
        error: a
      })
    }
    this.toolMessages.clear();
    for (let T of this.runningTools.values()) T.abort.abort();
    this.runningTools.clear(), this.cancelledToolUses.clear()
  }
  findToolUsesNeedingInvocation(T) {
    if (T.content.some((r) => r.type === "tool_use" && !Va(r))) return [];
    if (!(T.state?.type === "complete" || T.state?.type === "cancelled")) return [];
    let R = this.callbacks.getThread(),
      a = dt(R, "user"),
      e = dt(R, "assistant"),
      t = new Set;
    if (a?.messageId !== void 0 && e?.messageId !== void 0 && a.messageId > e.messageId) {
      for (let r of a.content)
        if (r.type === "tool_result") t.add(r.toolUseID)
    }
    return T.content.filter((r) => r.type === "tool_use").filter((r) => !t.has(r.id) && !this.cancelledToolUses.has(r.id))
  }
  async executeToolsWithPlan(T) {
    if (T.length === 0) return;
    let R = wwR(T, this.toolService);
    J.debug(`executing ${T.length} tools in ${R.length} batch(es)`, {
      name: "executeToolsWithPlan",
      threadID: this.threadID,
      batches: R.map((a) => a.map((e) => e.name))
    }), await this.executeToolBatchesSequentially(R)
  }
  async executeToolBatchesSequentially(T) {
    for (let R of T) {
      let a = (await Promise.allSettled(R.map((e) => this.invokeToolAndWait(e, void 0)))).filter((e) => e.status === "rejected");
      if (a.length > 0) J.warn(`${a.length} tool(s) failed in batch`, {
        name: "executeToolBatchesSequentially",
        threadID: this.threadID,
        errors: a.map((e) => e.reason)
      })
    }
  }
  async invokeToolAndWait(T, R) {
    let a = new Promise((e, t) => {
      this.toolCompletionResolvers.set(T.id, {
        resolve: e,
        reject: t
      })
    });
    this.invokeTool(T, R).catch((e) => {
      let t = this.toolCompletionResolvers.get(T.id);
      if (t) J.debug(`Tool invocation setup failed for ${T.id}`, {
        name: "invokeToolAndWait",
        threadID: this.threadID,
        error: String(e)
      }), t.reject(e), this.toolCompletionResolvers.delete(T.id)
    }), await a
  }
  async invokeTool(T, R) {
    if (this.runningTools.has(T.id)) throw Error(`(bug) tool invocation already in progress: ${T.id}`);
    if (!Va(T)) throw Error(`(bug) tool use is incomplete: ${T.id}`);
    let a = await this.callbacks.getConfig(),
      e = u7R(a.settings?.hooks, {
        threadID: this.threadID,
        toolUse: T
      }),
      {
        abortOp: t
      } = await this.callbacks.applyHookResult(e);
    if (t) {
      let c = this.toolCompletionResolvers.get(T.id);
      if (c) c.resolve(), this.toolCompletionResolvers.delete(T.id);
      return
    }
    let r = T.input;
    if (this.callbacks.requestPluginToolCall) {
      let c = {
          thread: {
            id: this.threadID
          },
          toolUseID: T.id,
          tool: T.name,
          input: T.input ?? {}
        },
        s = await this.callbacks.requestPluginToolCall(c);
      if (s.action === "error") {
        J.warn("Plugin returned error action", {
          tool: T.name,
          message: s.message,
          toolUseID: T.id
        });
        let A = this.toolCompletionResolvers.get(T.id);
        if (await this.callbacks.handle({
            type: "tool:data",
            toolUse: T.id,
            data: {
              status: "error",
              error: {
                message: `Plugin error: ${s.message}`,
                displayMessage: s.message
              }
            }
          }), A) A.resolve(), this.toolCompletionResolvers.delete(T.id);
        return
      }
      if (s.action === "reject-and-continue") {
        let A = this.toolCompletionResolvers.get(T.id);
        if (await this.callbacks.handle({
            type: "tool:data",
            toolUse: T.id,
            data: {
              status: "done",
              result: `Tool rejected by plugin: ${s.message}`,
              isFinal: !1
            }
          }), A) A.resolve(), this.toolCompletionResolvers.delete(T.id);
        return
      }
      if (s.action === "synthesize") {
        let A = this.toolCompletionResolvers.get(T.id);
        if (await this.callbacks.handle({
            type: "tool:data",
            toolUse: T.id,
            data: {
              status: "done",
              result: s.result.output,
              isFinal: !1
            }
          }), A) A.resolve(), this.toolCompletionResolvers.delete(T.id);
        return
      }
      if (s.action === "modify") r = s.input, await this.callbacks.handle({
        type: "tool:processed",
        toolUse: T.id,
        newArgs: s.input
      })
    }
    let h = new AbortController,
      i = {
        abort: h
      };
    this.runningTools.set(T.id, i), this.callbacks.updateThread({
      type: "tool:data",
      toolUse: T.id,
      data: {
        status: "in-progress"
      }
    });
    try {
      let c = await this.callbacks.getToolRunEnvironment(T.id, h.signal),
        s = new AR((u) => {
          this.toolMessages.set(T.id, u)
        }),
        A = {
          ...c,
          toolMessages: s
        },
        l = this.toolService.preprocessArgs?.(T.name, r, A);
      if (l) await this.callbacks.handle({
        type: "tool:processed",
        toolUse: T.id,
        newArgs: l
      });
      let o = l ?? r,
        n = this.toolService.normalizeToolName(T.name),
        p = typeof o === "object" && o !== null ? this.toolService.normalizeToolArgs(T.name, o) : o,
        _ = typeof p === "object" && p !== null && "__isFinal" in p && typeof p.__isFinal === "boolean" ? p.__isFinal : void 0,
        m = _ !== void 0 ? Object.fromEntries(Object.entries(p).filter(([u]) => u !== "__isFinal")) : p,
        b = this.toolService.invokeTool(n, {
          args: m,
          userInput: R
        }, A).pipe(M$(this.callbacks.getDisposed$()), tN(() => {
          this.runningTools.delete(T.id), this.toolMessages.get(T.id)?.complete(), this.toolMessages.delete(T.id)
        })).subscribe({
          next: async (u) => {
            if (this.cancelledToolUses.has(T.id)) return;
            if (J.debug(`${T.id}, ${u.status}`, {
                name: "invokeTool",
                threadID: this.threadID
              }), wt(u.status)) {
              this.runningTools.delete(T.id), b.unsubscribe();
              let k = this.toolCompletionResolvers.get(T.id);
              if (k) {
                if (u.status === "done") k.resolve();
                else k.reject(Error(`Tool ${u.status}: ${T.id}`));
                this.toolCompletionResolvers.delete(T.id)
              }
              if (u.status === "done" && u.trackFiles?.length) this.callbacks.trackFiles(u.trackFiles);
              if (u.status === "done" && T.name.toLowerCase() === oc.toLowerCase()) this.callbacks.onSkillToolComplete(T);
              if (a.settings?.hooks) {
                let x = y7R(a.settings.hooks, {
                  threadID: this.threadID,
                  toolUse: T
                });
                await this.callbacks.applyPostHookResult(x, {
                  toolUseID: T.id
                })
              }
              if (this.callbacks.requestPluginToolResult) {
                let x = {
                  toolUseID: T.id,
                  tool: T.name,
                  input: T.input ?? {},
                  status: u.status,
                  error: u.status === "error" ? u.error?.message : void 0,
                  output: u.status === "done" && typeof u.result === "string" ? u.result : void 0
                };
                try {
                  let f = await this.callbacks.requestPluginToolResult(x);
                  if (f) u = {
                    ...u,
                    status: f.status,
                    error: f.status === "error" ? {
                        message: f.error ?? "Plugin error"
                      } :
                      void 0,
                    result: f.output
                  }
                } catch (f) {
                  J.debug("Failed to request plugin tool result", {
                    error: f
                  })
                }
              }
            }
            await this.callbacks.updateFileChanges();
            let P = _ !== void 0 && u.status === "done" && u.isFinal === void 0 ? {
                ...u,
                isFinal: _
              } :
              u;
            await this.callbacks.handle({
              type: "tool:data",
              toolUse: T.id,
              data: P
            }, h.signal)
          },
          error: async (u) => {
            let P = this.toolCompletionResolvers.get(T.id);
            if (P) P.reject(u), this.toolCompletionResolvers.delete(T.id);
            await this.callbacks.handle({
              type: "tool:data",
              toolUse: T.id,
              data: {
                status: "error",
                error: {
                  message: "message" in u ? u.message : String(u),
                  displayMessage: "displayMessage" in u ? u.displayMessage : void 0
                }
              }
            }, h.signal)
          },
          complete: () => {
            let u = this.toolCompletionResolvers.get(T.id);
            if (!u) return;
            let P = this.callbacks.getThread(),
              k = sA(P).get(T.id)?.run;
            if (k && wt(k.status)) return;
            let x;
            if (this.callbacks.isDisposed()) x = "Worker disposed";
            else if (h.signal.aborted) x = "Tool aborted";
            else if (this.cancelledToolUses.has(T.id)) x = "Tool cancelled";
            else x = "Tool observable completed without terminal state";
            u.reject(Error(x)), this.toolCompletionResolvers.delete(T.id)
          }
        }),
        y = this.runningTools.get(T.id);
      if (y) y.subscription = b;
      xN(h.signal, () => b.unsubscribe())
    } catch (c) {
      this.runningTools.delete(T.id);
      let s = this.toolCompletionResolvers.get(T.id);
      if (s) s.reject(c), this.toolCompletionResolvers.delete(T.id);
      throw c
    }
  }
  async cancelTool(T, R, a) {
    let e = this.getCancelDataForToolRun(T, R),
      t = this.toolMessages.get(T);
    if (t) {
      try {
        t.next({
          type: "stop-command"
        })
      } catch (r) {
        J.warn("Failed to send stop-command", {
          toolUseID: T,
          error: r
        })
      }
      t.complete(), this.toolMessages.delete(T)
    }
    J.debug(`cancelTool(${T}, ${R})`), await this.callbacks.handle({
      type: "tool:data",
      toolUse: T,
      data: e
    }, a)
  }
  getCancelDataForToolRun(T, R) {
    let a = this.callbacks.getThread(),
      e = sA(a).get(T)?.run;
    return {
      status: "cancelled",
      progress: e ? FD(e) : void 0,
      reason: R
    }
  }
  markAllActiveToolsCancelled() {
    let T = this.callbacks.getThread(),
      R = dt(T, "assistant");
    if (R) {
      let a = dt(T, "user"),
        e = new Map;
      if (a) {
        for (let t of a.content)
          if (t.type === "tool_result") e.set(t.toolUseID, t.run)
      }
      for (let t of R.content)
        if (t.type === "tool_use" && Va(t)) {
          let r = e.get(t.id);
          if (!(r ? wt(r.status) : !1)) this.cancelledToolUses.add(t.id)
        }
    }
  }
  cancelUnstartedTools(T) {
    let R = this.callbacks.getThread(),
      a = sA(R),
      e = R.messages.findLastIndex((r) => NET(r)),
      t = e === -1 ? R.messages : R.messages.slice(e + 1);
    for (let r of t) {
      if (r.role !== "assistant") continue;
      for (let h of r.content)
        if (h.type === "tool_use" && Va(h)) {
          let i = a.get(h.id);
          if (i?.run.status === "blocked-on-user" && T === "system:disposed") continue;
          if (!i || i.run.status === "blocked-on-user") this.callbacks.updateThread({
            type: "tool:data",
            toolUse: h.id,
            data: {
              status: "cancelled",
              reason: T
            }
          })
        }
    }
  }
  async cancelInProgressTools(T) {
    for (let [R, a] of this.runningTools) a.abort.abort(), a.subscription?.unsubscribe(), await this.cancelTool(R, T);
    this.runningTools.clear()
  }
  findToolUseById(T) {
    let R = this.callbacks.getThread(),
      a = dt(R, "assistant");
    if (!a) return;
    for (let e of a.content)
      if (e.type === "tool_use" && e.id === T) return e;
    return
  }
  isDangerousToResume(T) {
    return T === U8 || T === S2 || T === Eb || T === Dt || T === j0T
  }
  abortToolOp(T) {
    let R = this.runningTools.get(T);
    if (R) R.abort.abort(), this.runningTools.delete(T)
  }
  abortAllTools() {
    for (let [T, R] of this.runningTools) {
      let a = this.toolMessages.get(T);
      if (a) {
        try {
          a.next({
            type: "stop-command"
          }), a.complete()
        } catch (e) {
          J.warn("Failed to send stop-command during disposal", {
            toolId: T,
            error: e
          })
        }
        this.toolMessages.delete(T)
      }
      R.abort.abort()
    }
    this.runningTools.clear()
  }
}

function GWT(T) {
  let R = [],
    a = /@((?:[^\s@\\,;]|\\.)+)/g,
    e;
  while ((e = a.exec(T)) !== null) {
    let t = e[1],
      r = NwR(t).replace(/[.,;:!?)}\]]+$/, "");
    R.push(r)
  }
  return {
    paths: R
  }
}

function NwR(T) {
  if (T.match(/^[A-Za-z]:[\\]/)) return T.replace(/\\(.)/g, (R, a) => {
    if (a === " " || a === "(" || a === ")" || a === "[" || a === "]" || a === "?" || a === "*") return a;
    return R
  });
  return T.replace(/\\(.)/g, "$1")
}
async function KWT() {
  if (!await Us.isConnected()) return;
  let T = await m0(Us.status),
    R = T.selections?.[0],
    a = lCT(R),
    e = a && R ? {
      line: R.range.startLine + 1,
      column: R.range.startCharacter
    } :
    void 0;
  return {
    currentlyVisibleFiles: T.visibleFiles ?? [],
    activeEditor: T.openFile,
    cursorLocation: e,
    cursorLocationLine: void 0,
    selectionRange: !a && R ? {
        start: {
          line: R?.range.startLine + 1,
          column: R?.range.startCharacter
        },
        end: {
          line: R?.range.endLine + 1,
          column: R?.range.endCharacter
        }
      } :
      void 0
  }
}
async function UwR(T, {
  configService: R,
  filesystem: a
}) {
  let e = {
      sentAt: Date.now()
    },
    t = kr(T.content),
    {
      paths: r
    } = GWT(t),
    h = await m0(R.workspaceRoot);
  if (!h) return {
    message: {
      role: "user",
      messageId: 0,
      content: T.content,
      source: T.source,
      fileMentions: void 0,
      userState: void 0,
      agentMode: T.agentMode,
      meta: e
    }
  };
  let i = await uwT({
      fileSystem: a
    }, r, {
      searchPaths: [h],
      shouldIncludeImages: !T.agentMode || TCT(T.agentMode)
    }),
    c;
  if (i?.files && i.files.length > 0) {
    let A = new Set,
      l = [];
    for (let o of i.files) {
      let n = I8(o.uri),
        p = await fm(a, n, h, null, A, void 0);
      for (let _ of p) {
        if (!l.some((m) => m.uri === _.uri)) l.push(_);
        A.add(_.uri)
      }
    }
    if (l.length > 0) c = l
  }
  let s = await KWT();
  return {
    message: {
      role: "user",
      messageId: 0,
      content: i?.imageBlocks?.length ? [...T.content, ...i.imageBlocks] : T.content,
      source: T.source,
      fileMentions: i,
      userState: {
        ...s ?? c7
      },
      agentMode: T.agentMode,
      discoveredGuidanceFiles: c,
      meta: e
    }
  }
}

function zwR(T, R) {
  return Promise.race([T, new Promise((a, e) => setTimeout(() => e(Error("Snapshot git operation timed out")), R))])
}
async function ks(T, R) {
  let {
    stdout: a
  } = await XWT("git", T, {
    cwd: R.cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      ...R.env
    },
    maxBuffer: 16777216
  });
  return a.trim()
}
async function FwR(T, R, a) {
  let e = RaT.join(TaT.tmpdir(), `amp-snapshot-${R}-${a}-${Date.now()}`);
  try {
    let t = {
      GIT_INDEX_FILE: e,
      GIT_WORK_TREE: T
    };
    try {
      await ks(["read-tree", "HEAD"], {
        cwd: T,
        env: t
      })
    } catch {
      await ks(["read-tree", "--empty"], {
        cwd: T,
        env: t
      })
    }
    await ks(["add", "-A"], {
      cwd: T,
      env: t
    });
    let r = await ks(["write-tree"], {
        cwd: T,
        env: t
      }),
      h = `refs/amp/snapshots/${R}/${a}`;
    return await ks(["update-ref", "-m", `amp snapshot ${R} ${a}`, h, r], {
      cwd: T
    }), {
      treeOID: r,
      repoRoot: T
    }
  } finally {
    try {
      J3T.unlinkSync(e)
    } catch {}
  }
}
async function GwR(T) {
  try {
    return await ks(["rev-parse", "--git-dir"], {
      cwd: T
    }), !0
  } catch {
    return !1
  }
}
async function KwR(T) {
  let R = RaT.join(TaT.tmpdir(), `amp-restore-${Date.now()}`);
  try {
    let a = {
      GIT_INDEX_FILE: R,
      GIT_WORK_TREE: T.repoRoot
    };
    try {
      await ks(["read-tree", "HEAD"], {
        cwd: T.repoRoot,
        env: a
      })
    } catch {
      await ks(["read-tree", "--empty"], {
        cwd: T.repoRoot,
        env: a
      })
    }
    await ks(["add", "-A"], {
      cwd: T.repoRoot,
      env: a
    }), await ks(["checkout", "--no-overlay", T.treeOID, "--", "."], {
      cwd: T.repoRoot,
      env: a
    })
  } finally {
    try {
      J3T.unlinkSync(R)
    } catch {}
  }
}
async function VwR(T, R, a) {
  let e = [];
  for (let t of T) {
    if (!Pj(t)) continue;
    let r = t.fsPath;
    if (!await GwR(r)) continue;
    try {
      let h = await zwR(FwR(r, R, a), XwR);
      if (h) e.push(h)
    } catch (h) {
      J.debug("Auto-snapshot failed", {
        workspacePath: r,
        threadId: R,
        messageId: a,
        error: h
      })
    }
  }
  return e
}

function YwR(T, R) {
  let a = dt(T, "assistant");
  if (!a) return {
    updatedThread: T,
    uninvoked: []
  };
  let e = a.content.filter((r) => r.type === "tool_use"),
    t = R.items.filter((r) => !R.wasInvoked(e, r));
  if (t.length === 0) return {
    updatedThread: T,
    uninvoked: []
  };
  return {
    updatedThread: Lt(T, (r) => {
      let h = r.messages.findLast((i) => i.role === "assistant");
      if (h && h.role === "assistant") {
        for (let i of t) {
          let c = fx();
          h.content.push({
            type: "tool_use",
            complete: !0,
            id: c,
            name: R.toolName,
            input: R.toToolInput(i)
          })
        }
        if (h.state.type === "complete" && h.state.stopReason === "end_turn") h.state = {
          ...h.state,
          stopReason: "tool_use"
        }
      }
      r.v++
    }),
    uninvoked: t
  }
}
class ov {
  deps;
  threadID;
  trackFilesFromHistory() {
    J.debug("Tracking files from thread history", {
      name: "trackFilesFromHistory",
      threadID: this.threadID
    });
    for (let T of this.thread.messages) {
      if (T.role === "user" && T.fileMentions?.files) this.trackFiles(T.fileMentions.files.map((R) => R.uri).filter((R) => R !== void 0));
      if (T.role === "user") {
        for (let R of T.content)
          if (R.type === "tool_result" && R.run?.status === "done") this.trackFiles(R.run.trackFiles ?? [])
      }
    }
  }
  async getConfig(T) {
    return m0(this.deps.configService.config, T)
  }
  async isAutoSnapshotEnabled() {
    return (await this.getConfig()).settings["experimental.autoSnapshot"] ?? !1
  }
  async restoreToSnapshot(T) {}
  setupSettingsChangeHandlers() {
    this.setupPermissionsChangeHandler()
  }
  setupEphemeralErrorLogging() {
    this.ephemeralError.pipe(M$(this.disposed$)).subscribe((T) => {
      if (T) J.error("ephemeral error", {
        error: T
      })
    })
  }
  setupPermissionsChangeHandler() {
    this.deps.configService.config.pipe(JR((T) => ({
      permissions: I0T(T.settings?.permissions),
      dangerouslyAllowAll: T.settings?.dangerouslyAllowAll ?? !1
    })), E9((T, R) => T.dangerouslyAllowAll === R.dangerouslyAllowAll && T.permissions === R.permissions), DnR(1), M$(this.disposed$)).subscribe(() => {
      this.reevaluateBlockedTools()
    })
  }
  reevaluateBlockedTools() {
    if (this.isDisposed) return;
    for (let T = this.thread.messages.length - 1; T >= 0; T--) {
      let R = this.thread.messages[T];
      if (!R || R.role !== "user") continue;
      let a = !1;
      for (let e of R.content)
        if (e.type === "tool_result" && e.run?.status === "blocked-on-user" && e.toolUseID) a = !0, this.checkAndApproveBlockedTool(e.toolUseID);
      if (!a) break
    }
  }
  async checkAndApproveBlockedTool(T) {
    try {
      let R = Tn(this.thread, T);
      if (!R) {
        J.warn("Tool use block not found for blocked tool", {
          toolUseID: T
        });
        return
      }
      let a = await PLT(R.name, R.input ?? {}, {
        configService: this.deps.configService
      }, this.thread.mainThreadID ? "subagent" : "thread", this.threadID, T);
      if (a.permitted) J.info("Auto-approving previously blocked tool due to permission change", {
        toolName: R.name,
        toolUseID: T,
        threadID: this.threadID
      }), this.handle({
        type: "user:tool-input",
        toolUse: T,
        value: {
          accepted: !0
        }
      });
      else J.debug("Tool remains blocked after permission change", {
        toolName: R.name,
        toolUseID: T,
        reason: a.reason
      })
    } catch (R) {
      J.warn("Failed to re-evaluate blocked tool", {
        error: R,
        toolUseID: T
      })
    }
  }
  ops = {
    tools: {},
    toolMessages: {},
    inference: null,
    titleGeneration: null
  };
  _state = new f0("initial");
  state = this._state.pipe(E9(), f3({
    shouldCountRefs: !0
  }));
  handleMutex = new Cm;
  ephemeralError = new f0(void 0);
  ephemeralErrorRetryAttempt = 0;
  retryCountdownSeconds = new f0(void 0);
  retryTimer = null;
  retrySession = 0;
  _inferenceState = new f0("idle");
  _turnStartTime = new f0(void 0);
  _turnElapsedMs = new f0(void 0);
  fileChanges = new f0({
    files: []
  });
  get inferenceState() {
    return this._inferenceState.getValue()
  }
  toolCallUpdates = new W0;
  trackedFiles = new Ls;
  discoveredGuidanceFileURIs = new Set;
  fs;
  cachedFileChanges = [];
  disposed$ = new W0;
  isDisposed = !1;
  shouldContinueAfterRejection = !1;
  _pendingSkills = new f0([]);
  handoffState = new f0(void 0);
  pendingSkills = this._pendingSkills.pipe(E9(), f3({
    shouldCountRefs: !0
  }));
  _awaitingSkillInvocation = new f0([]);
  toolOrchestrator;
  currentAgentSpan = null;
  currentSpan = null;
  traceStore;
  constructor(T, R) {
    this.deps = T, this.threadID = R, this.fs = Q3T({
      fileChangeTrackerStorage: this.deps.fileChangeTrackerStorage
    }, this.deps.osFileSystem, R), this.traceStore = {
      startTrace: (a) => {
        this.updateThread({
          type: "trace:start",
          span: a
        })
      },
      recordTraceEvent: (a, e) => {
        this.updateThread({
          type: "trace:event",
          span: a,
          event: e
        })
      },
      recordTraceAttributes: (a, e) => {
        this.updateThread({
          type: "trace:attributes",
          span: a,
          attributes: e
        })
      },
      endTrace: (a) => {
        this.updateThread({
          type: "trace:end",
          span: a
        })
      }
    }, this.toolOrchestrator = new FWT(R, T.toolService, this.createOrchestratorCallbacks())
  }
  createTracer(T) {
    return IDT(this.traceStore, T)
  }
  getPluginTracer() {
    let T = this.currentSpan?.id ?? this.currentAgentSpan?.span;
    if (!T) return;
    return this.createTracer(T)
  }
  createOrchestratorCallbacks() {
    return {
      getThread: () => this.thread,
      updateThread: (T) => this.updateThread(T),
      handle: (T, R) => this.handle(T, R),
      getToolRunEnvironment: (T, R) => this.getToolRunEnvironment(T, R),
      getHooks: async () => (await this.getConfig()).settings?.hooks,
      getConfig: () => this.getConfig(),
      updateFileChanges: () => this.updateFileChanges(),
      trackFiles: (T) => this.trackFiles(T),
      isDisposed: () => this.isDisposed,
      getDisposed$: () => this.disposed$,
      onSkillToolComplete: (T) => this.onSkillToolComplete(T),
      applyHookResult: (T) => Promise.resolve(BI(this, T)),
      applyPostHookResult: (T, R) => Promise.resolve(BI(this, T, R)),
      requestPluginToolCall: this.deps.pluginService ? (T) => this.deps.pluginService.event.toolCall(T, this.getPluginTracer()) : void 0,
      requestPluginToolResult: this.deps.pluginService ? (T) => this.deps.pluginService.event.toolResult(T, this.getPluginTracer()) : void 0
    }
  }
  async getToolRunEnvironment(T, R) {
    let a = await this.getWorkspaceRoot(R),
      e = O0T(this.thread),
      t = Tn(this.thread, T);
    return {
      ...this.deps,
      dir: a,
      tool: t?.name ?? "",
      thread: this.thread,
      config: await this.getConfig(R),
      trackedFiles: new Ls(this.trackedFiles),
      filesystem: this.fs.trackedFileSystem(T),
      fileChangeTracker: this.fs.tracker,
      getAllTrackedChanges: this.getAllTrackedChanges.bind(this),
      toolUseID: T,
      todos: e,
      toolMessages: new AR(() => {}),
      threadEnvironment: this.thread.env?.initial ?? await this.deps.getThreadEnvironment(),
      handleThreadDelta: this.handle.bind(this),
      agentMode: await this.getSelectedAgentMode(),
      discoveredGuidanceFileURIs: this.discoveredGuidanceFileURIs,
      dtwHandoffService: void 0
    }
  }
  onSkillToolComplete(T) {
    let R = T.input;
    this.thread = Lt(this.thread, (a) => {
      if (!a.activatedSkills) a.activatedSkills = [];
      if (!a.activatedSkills.some((e) => e.name === R.name)) a.activatedSkills.push({
        name: R.name,
        arguments: R.arguments
      })
    })
  }
  status = this.state.pipe(L9((T) => T === "active" ? v3(this._inferenceState.pipe(E9()), this.fileChanges.pipe(E9()), this.ephemeralError, this.handoffState.pipe(E9()), this.retryCountdownSeconds.pipe(E9()), this._turnStartTime.pipe(E9()), this._turnElapsedMs.pipe(E9()), this.toolCallUpdates.pipe(Y3(void 0))).pipe(JR(([R, a, e, t, r, h, i]) => ({
    state: T,
    inferenceState: R,
    fileChanges: a,
    ephemeralError: e ? {
        message: e.message,
        stack: "stack" in e ? e.stack : void 0,
        error: "error" in e && e.error && typeof e.error === "object" && "error" in e.error ? e.error.error : void 0,
        retryCountdownSeconds: r
      } :
      void 0,
    handoff: t,
    turnStartTime: h,
    turnElapsedMs: i
  })), M$(this.disposed$)) : AR.of({
    state: T
  })), f3({
    shouldCountRefs: !0
  }));
  threadReadWriter = null;
  get thread() {
    if (!this.threadReadWriter) throw Error(`thread read-writer not initialized for ThreadWorker: ${this.threadID}`);
    return this.threadReadWriter.read()
  }
  set thread(T) {
    if (!this.threadReadWriter) throw Error(`thread read-writer not initialized for ThreadWorker: ${this.threadID}`);
    this.threadReadWriter.write(T), this.__testing__setThread(T)
  }
  updateThread(T) {
    if (!this.threadReadWriter) throw Error(`thread read-writer not initialized for ThreadWorker: ${this.threadID}`);
    this.threadReadWriter.update(BfR(T, new Date)), this.__testing__setThread(this.threadReadWriter.read())
  }
  async acquireThread() {
    if (!this.threadReadWriter) this.threadReadWriter = await this.deps.threadService.exclusiveSyncReadWriter(this.threadID), this._state.next("active")
  }
  __testing__setThread(T) {}
  __testing__getDeps() {
    return this.deps
  }
  async resume() {
    if (this.resumed) return;
    if (this.resumed = !0, this.handleCalled) throw Error("cannot call ThreadWorker.resume after ThreadWorker.handle");
    if (await this.acquireThread(), !await this.isAutoSnapshotEnabled()) await this.restoreFileChangesFromBackups();
    let T = this.thread.messages.at(-1);
    if (T?.role === "assistant" && T.state.type === "streaming") this.updateThread({
      type: "thread:truncate",
      fromIndex: this.thread.messages.length - 1
    });
    if (this.trackFilesFromHistory(), this.triggerTitleGeneration(), !this.shouldResumeFromLastMessage(T)) return;
    await this.toolOrchestrator.onResume(), this.setupSettingsChangeHandlers(), this.setupEphemeralErrorLogging(), this.replayLastCompleteMessage()
  }
  resumed = !1;
  shouldResumeFromLastMessage(T) {
    if (NlR(T) || HlR(T) && !this.shouldContinueAfterRejection || NET(T)) return this._inferenceState.next("cancelled"), !1;
    return !0
  }
  replayLastCompleteMessage() {
    let T = this.thread.messages.findLastIndex((a) => a.role === "user" ? qlR(a) : a.role === "assistant" && a.state.type === "complete");
    if (T === -1) {
      if (this.thread.messages.length !== 0) throw Error(`(bug) invalid thread: ${this.threadID}`);
      return
    }
    let R = this.thread.messages[T];
    switch (R.role) {
      case "user":
        if (!R.interrupted) this.onThreadDelta({
          type: "user:message",
          message: R
        });
        break;
      case "assistant":
        this.onThreadDelta({
          type: "assistant:message",
          message: R
        });
        break
    }
  }
  async handle(T, R) {
    let a = T.type === "user:message" && T.index !== void 0 ? T.index : void 0;
    await this.handleMutex.acquire();
    try {
      await this.innerHandle(T, R)
    } finally {
      this.handleMutex.release()
    }
    if (a !== void 0) await this.performMessageEditCleanup(a)
  }
  async innerHandle(T, R) {
    if (this.isDisposed) {
      J.debug(`Skipping ${T.type} - worker disposed.`, {
        name: "handle queue",
        threadID: this.threadID
      });
      return
    }
    if (R?.aborted) {
      J.debug(`Skipping ${T.type} - signal aborted.`, {
        name: "handle queue",
        threadID: this.threadID
      });
      return
    }
    if (await this.resume(), this.handleCalled = !0, await this.acquireThread(), T.type === "pending-skills") {
      let t = this._pendingSkills.getValue();
      this._pendingSkills.next([...t, ...T.skills]), J.info("Pending skills set for injection", {
        threadID: this.threadID,
        skillNames: T.skills.map((r) => r.name)
      });
      return
    }
    let a = T,
      e = [];
    if (T.type === "user:message") {
      let t = await UwR(T.message, {
          configService: this.deps.configService,
          filesystem: this.fs.fileSystem
        }),
        r = (await this.getConfig(R)).settings["experimental.autoSnapshot"] ?? !1,
        h = [];
      if (r) {
        let i = this.thread.nextMessageId ?? 0,
          c = await this.getWorkspaceRoot(R ?? new AbortController().signal),
          {
            createSnapshots: s
          } = await Promise.resolve().then(() => (fmT(), OX));
        h = await s(c ? [c] : [], this.threadID, i)
      }
      if (e = this._pendingSkills.getValue(), e.length > 0) J.info("Pending skills will be injected as info message", {
        threadID: this.threadID,
        skillNames: e.map((i) => i.name)
      }), this._pendingSkills.next([]);
      a = Lt(T, (i) => {
        if (i.message = O8(t.message), h.length > 0) {
          if (!i.message.userState) i.message.userState = O8({
            currentlyVisibleFiles: []
          });
          i.message.userState.snapshotOIDs = O8(h)
        }
        R?.throwIfAborted()
      })
    }
    if (a.type === "assistant:message" || a.type === "assistant:message-update") a = this.addNormalizedInputToToolUses(a);
    try {
      if (this.ephemeralError.getValue() !== void 0) this.ephemeralError.next(void 0);
      let t = this.thread;
      if (this.updateThread(a), this.onThreadDelta(a, t), e.length > 0) await this.injectPendingSkills(e, R)
    } catch (t) {
      if (!xr(t)) J.error("Ephemeral error during handle processing", t, {
        name: "ThreadWorker",
        threadID: this.threadID
      }), this.ephemeralError.next(t instanceof Error ? t : Error(String(t)));
      else J.debug(`AbortError caught during handle processing for ${a.type}.`, {
        name: "handle queue",
        threadID: this.threadID
      })
    }
  }
  handleCalled = !1;
  addNormalizedInputToToolUses(T) {
    let R = this.thread.agentMode;
    if (!T.message.content.some((a) => a.type === "tool_use")) return T;
    return Lt(T, (a) => {
      for (let e of a.message.content)
        if (e.type === "tool_use") {
          if (!e.name) {
            J.warn("Skipping tool_use normalization due to missing name", {
              threadID: this.threadID
            });
            continue
          }
          let t = this.deps.toolService.normalizeToolName(e.name);
          if (t !== e.name) e.normalizedName = t;
          if (e.input && typeof e.input === "object") {
            let r = this.deps.toolService.normalizeToolArgs(e.name, e.input, R);
            if (JSON.stringify(r) !== JSON.stringify(e.input)) e.normalizedInput = r
          }
          if ((t !== e.name ? t : e.name) === j0T && !e.metadata?.handoffThreadID) e.metadata = {
            ...e.metadata,
            handoffThreadID: Eh()
          }
        }
    })
  }
  onThreadDelta(T, R) {
    switch (T.type) {
      case "user:message": {
        if (this.resetRetryAttempts(), this._turnStartTime.next(Date.now()), this._turnElapsedMs.next(void 0), T.index !== void 0 && R) {
          let t = R.messages[T.index];
          if (t?.role === "user" && t.userState?.snapshotOIDs && t.userState.snapshotOIDs.length > 0) this.restoreToSnapshot([...t.userState.snapshotOIDs]).catch((r) => {
            J.error("Failed to restore edit snapshots", r, {
              name: "ThreadWorker",
              threadID: this.threadID
            })
          })
        }
        if (T.index !== void 0) this.trackedFiles.clear(), this.thread.messages.forEach((t) => {
          if (t.role === "user") {
            for (let r of t.content)
              if (r.type === "tool_result" && r.run?.status === "done" && r.run.trackFiles) this.trackFiles(r.run.trackFiles);
            if (t.fileMentions?.files) this.trackFiles(t.fileMentions.files.map((r) => r.uri).filter((r) => r !== void 0))
          }
        });
        else this.trackFiles(T.message.fileMentions?.files?.map((t) => t.uri).filter((t) => t !== void 0) ?? []);
        let a = this.thread.messages.at(-1)?.messageId ?? 0,
          e = kr(T.message.content);
        this.startAgentSpan(a), this.runInferenceAndUpdateThread({
          agentStart: {
            messageId: a,
            messageText: e
          }
        });
        break
      }
      case "user:message-queue:dequeue": {
        let a = this.thread.messages.at(-1);
        if (!a) break;
        if (a.role !== "user") break;
        this._turnStartTime.next(Date.now()), this._turnElapsedMs.next(void 0), this.trackFiles(a.fileMentions?.files?.map((r) => r.uri).filter((r) => r !== void 0) ?? []);
        let e = a.messageId ?? 0,
          t = kr(a.content);
        this.startAgentSpan(e), this.runInferenceAndUpdateThread({
          agentStart: {
            messageId: e,
            messageText: t
          }
        });
        break
      }
      case "user:tool-input": {
        this.toolOrchestrator.userProvideInput(T.toolUse, T.value).catch((a) => {
          J.error("userProvideInput failed", {
            name: "ThreadWorker.handleDelta",
            threadID: this.threadID,
            toolUse: T.toolUse,
            error: a instanceof Error ? a.message : String(a)
          })
        });
        break
      }
      case "tool:data": {
        if (this.toolOrchestrator.isCancelled(T.toolUse)) {
          let e = sA(this.thread).get(T.toolUse)?.run,
            t = e ? FD(e) : void 0;
          this.updateThread({
            type: "tool:data",
            toolUse: T.toolUse,
            data: {
              status: "cancelled",
              reason: "user:interrupted",
              progress: t
            }
          });
          return
        }
        let a = Tn(this.thread, T.toolUse);
        if (T.data.status === "done" && a?.name === db) {
          let e = T.data.result;
          if ("task" in e && e.nextTask) {
            let t = $h(this.thread),
              r = this.deps.internalHooks?.onTaskCompleted?.({
                thread: this.thread,
                completedTask: e.task,
                nextTask: e.nextTask,
                usage: t ? {
                    totalInputTokens: t.totalInputTokens,
                    maxInputTokens: t.maxInputTokens
                  } :
                  void 0
              });
            if (r) BI(this, r)
          }
        }
        if (wt(T.data.status)) this.toolOrchestrator.clearCancelled(T.toolUse), this.toolOrchestrator.resolveToolCompletion(T.toolUse, T.data.status === "done", Error(`Tool ${T.data.status}: ${T.toolUse}`));
        if (a) {
          let e = QwR(this.thread, T.toolUse, this.shouldContinueAfterRejection);
          J.debug(`updated tool_result${e?" and running inference because all tools completed":""}`, {
            name: `handleThreadDelta(${T.type}, ${T.toolUse}, ${T.data.status})`,
            threadID: this.threadID
          });
          let t = this.shouldContinueAfterRejection || this._inferenceState.getValue() !== "cancelled";
          if (e && t) this.runInferenceAndUpdateThread()
        }
        this.toolCallUpdates.next();
        break
      }
      case "assistant:message": {
        if (T.message.state.type === "complete" && T.message.state.stopReason === "tool_use") {
          let a = this.thread.messages.at(-1);
          (this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : Yo).startActiveSpan("tools", {
            context: {
              messageId: a?.messageId
            }
          }, async () => {
            await this.toolOrchestrator.onAssistantMessageComplete(T.message)
          }).catch((e) => {
            J.error("onAssistantMessageComplete failed", {
              name: "ThreadWorker.handleDelta",
              threadID: this.threadID,
              messageState: T.message.state.type,
              error: e instanceof Error ? e.message : String(e)
            })
          })
        }
        break
      }
      case "assistant:message-update":
        break;
      case "user:message-queue:enqueue": {
        let a = this._inferenceState.getValue();
        if (IUT(this.thread, a) !== "tool-running") {
          if (a === "cancelled") {
            this.handle({
              type: "user:message-queue:dequeue"
            });
            break
          } else if (a === "idle") {
            let e = this.thread.messages.at(-1);
            if (e?.role === "assistant") {
              if (e.state.type === "cancelled" || e.state.type === "error") {
                this.handle({
                  type: "user:message-queue:dequeue"
                });
                break
              }
              if (e.state.type === "complete" && e.state.stopReason !== "tool_use") {
                this.handle({
                  type: "user:message-queue:dequeue"
                });
                break
              }
            } else if (e?.role === "info") {
              this.handle({
                type: "user:message-queue:dequeue"
              });
              break
            }
          }
        }
        break
      }
      case "info:manual-bash-invocation": {
        this.handle({
          type: "user:message-queue:dequeue"
        });
        break
      }
      case "cancelled": {
        if (this.resetRetryAttempts(), this.currentAgentSpan && this.currentAgentSpan.messageId !== void 0) {
          let a = this.currentAgentSpan.messageId,
            e = this.createTracer(this.currentAgentSpan.span);
          this.stopAgentSpan(this.currentAgentSpan.span), this.deps.pluginService.event.agentEnd({
            message: this.getMessageText(a),
            id: a,
            status: "interrupted",
            messages: Wq(this.getMessagesSince(a))
          }, e).then((t) => this.handleAgentEndResult(t)).catch((t) => J.debug("Failed to emit agent.end", {
            error: t
          }))
        }
        break
      }
      case "thread:truncate": {
        if (this.toolOrchestrator.cancelAll("system:edited").catch((a) => {
            J.error("Failed to cancel tools on truncate", a, {
              name: "ThreadWorker",
              threadID: this.threadID
            })
          }), R) {
          let a = R.messages[T.fromIndex];
          if (a?.role === "user" && a.userState?.snapshotOIDs && a.userState.snapshotOIDs.length > 0)
            for (let e of a.userState.snapshotOIDs) Promise.resolve().then(() => (fmT(), OX)).then(({
              restoreSnapshot: t
            }) => t(e)).catch((t) => {
              J.error("Failed to restore edit snapshots on truncate", t, {
                name: "ThreadWorker",
                threadID: this.threadID
              })
            });
          else this.cleanupFileChanges(T.fromIndex).catch((e) => {
            J.error("Failed to cleanup file changes on truncate", e, {
              name: "ThreadWorker",
              threadID: this.threadID
            })
          })
        }
        break
      }
      case "inference:completed": {
        this.resetRetryAttempts();
        let a = T.model?.includes("gpt-5") || T.model?.includes("codex"),
          e = !T.usage || T.usage.totalInputTokens === 0 || T.usage.outputTokens === 0;
        if (a && e) J.warn("[thread-worker] Missing token counts in deep mode inference", {
          threadID: this.threadID,
          model: T.model,
          hasUsage: !!T.usage,
          inputTokens: T.usage?.inputTokens,
          outputTokens: T.usage?.outputTokens,
          totalInputTokens: T.usage?.totalInputTokens,
          cacheReadInputTokens: T.usage?.cacheReadInputTokens,
          cacheCreationInputTokens: T.usage?.cacheCreationInputTokens
        });
        let t = dt(this.thread, "assistant");
        if (t && t.state.type === "complete" && t.state.stopReason === "refusal") {
          this.ephemeralError.next(Error("The model refused to respond to this request. Please retry with a different prompt."));
          break
        }
        this.checkAndAppendAwaitedSkills();
        let r = dt(this.thread, "assistant"),
          h = r?.state.type === "complete" && r.state.stopReason === "tool_use";
        if (r && h) {
          let i = this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : Yo,
            c = r.messageId;
          i.startActiveSpan("tools", {
            context: {
              messageId: c
            }
          }, async () => {
            await this.toolOrchestrator.onAssistantMessageComplete(r)
          }).catch((s) => {
            J.error("onAssistantMessageComplete failed after inference", {
              name: "ThreadWorker.handleDelta",
              threadID: this.threadID,
              messageState: r.state.type,
              error: s instanceof Error ? s.message : String(s)
            })
          })
        }
        if (r && r.state.type === "complete" && r.state.stopReason === "end_turn") {
          let i = this._turnStartTime.getValue();
          if (i !== void 0) {
            let c = Date.now() - i;
            this._turnElapsedMs.next(c), this.thread = Lt(this.thread, (s) => {
              let A = s.messages.findLast((l) => l.role === "assistant");
              if (A && A.role === "assistant") A.turnElapsedMs = c;
              s.v++
            })
          }
          if (this._turnStartTime.next(void 0), this.thread.queuedMessages && this.thread.queuedMessages.length > 0) this.handle({
            type: "user:message-queue:dequeue"
          });
          else {
            BI(this, P7R(this.deps.internalHooks?.onAssistantTurnEnd, {
              thread: this.thread
            }));
            let c = $h(this.thread);
            if (c && this.deps.internalHooks?.onInferenceCompleted) {
              let s = this.deps.internalHooks.onInferenceCompleted({
                thread: this.thread,
                usage: {
                  totalInputTokens: c.totalInputTokens,
                  maxInputTokens: c.maxInputTokens
                },
                isIdle: !0
              });
              BI(this, s)
            }
            if (this.currentAgentSpan && this.currentAgentSpan.messageId !== void 0) {
              let s = this.currentAgentSpan.messageId,
                A = this.createTracer(this.currentAgentSpan.span);
              this.stopAgentSpan(this.currentAgentSpan.span), this.deps.pluginService.event.agentEnd({
                message: this.getMessageText(s),
                id: s,
                status: "done",
                messages: Wq(this.getMessagesSince(s))
              }, A).then((l) => this.handleAgentEndResult(l)).catch((l) => J.debug("Failed to emit agent.end", {
                error: l
              }))
            }
          }
        }
        break
      }
    }
  }
  getMessageText(T) {
    let R = this.thread.messages.find((a) => a.messageId === T);
    if (R) return kr(R.content);
    return ""
  }
  getMessagesSince(T) {
    let R = this.thread.messages.findIndex((a) => a.messageId === T);
    if (R === -1) return [];
    return this.thread.messages.slice(R)
  }
  startAgentSpan(T) {
    let R = fDT();
    this.currentAgentSpan = {
      span: R,
      messageId: T
    }, this.updateThread({
      type: "trace:start",
      span: {
        name: "agent",
        id: R,
        startTime: new Date().toISOString(),
        context: {
          messageId: T
        }
      }
    })
  }
  stopAgentSpan(T) {
    if (this.updateThread({
        type: "trace:end",
        span: {
          name: "agent",
          id: T,
          endTime: new Date().toISOString()
        }
      }), this.currentAgentSpan?.span === T) this.currentAgentSpan = null
  }
  handleAgentEndResult(T) {
    if (T.action !== "continue" || !T.userMessage) return;
    this.handle({
      type: "user:message",
      message: {
        content: [{
          type: "text",
          text: T.userMessage
        }]
      }
    }).catch((R) => {
      J.debug("Failed to handle plugin agent.end continue", {
        error: R
      })
    })
  }
  triggerTitleGeneration() {
    if (this.thread.mainThreadID !== void 0 || this.thread.title) return;
    this.ops.titleGeneration?.abort(), this.ops.titleGeneration = new AbortController;
    let T = this.ops.titleGeneration.signal;
    this.getConfig(T).then((R) => {
      if (T.aborted) return;
      let a = R.settings?.["agent.skipTitleGenerationIfMessageContains"],
        e = Array.isArray(a) ? a.filter((r) => typeof r === "string") : [],
        t = this.thread.messages.find((r) => {
          if (r.role !== "user") return !1;
          let h = kr(r.content);
          if (!h) return !1;
          if (e.length === 0) return !0;
          return !e.some((i) => h.includes(i))
        });
      if (J.debug("Checking for message to generate title for", {
          skipPatterns: e,
          rawSkipPatterns: a,
          hasFirstEligibleMessage: t !== void 0,
          firstEligibleMessageId: t?.messageId
        }), t) this.deps.generateThreadTitle(t, this.thread.id, this.deps.configService, T).then(({
        title: r,
        usage: h
      }) => {
        if (T.aborted || this.isDisposed) return;
        if (r !== void 0 && this.thread.title !== r) this.updateThread({
          type: "title",
          value: r,
          usage: h
        })
      }).catch((r) => {
        if (!xr(r)) J.error("generateThreadTitle error", r, {
          name: "ThreadWorker",
          threadID: this.threadID
        });
        else J.info("Title generation aborted", {
          firstEligibleMessageId: t?.messageId,
          threadID: this.threadID
        })
      })
    }).catch((R) => {
      if (!xr(R)) J.error("ThreadWorker title generation config error", R);
      else J.info("Title generation aborted in outer catch", {
        threadID: this.threadID
      })
    })
  }
  async getWorkspaceRoot(T) {
    let R = await m0(this.deps.configService.workspaceRoot, T);
    if (R) return R;
    let a = this.thread.env?.initial?.trees?.find((e) => e.uri !== void 0)?.uri;
    return a ? Ht(a) : null
  }
  async runInferenceAndUpdateThread(T) {
    if (T?.agentStart) {
      let {
        messageId: R,
        messageText: a
      } = T.agentStart;
      try {
        let e = await this.deps.pluginService.event.agentStart({
          message: a,
          id: R
        }, this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : void 0, {
          threadID: this.threadID
        });
        if (e.message) this.updateThread({
          type: "user:message:append-content",
          messageId: R,
          content: [{
            type: "text",
            text: e.message.content
          }]
        })
      } catch (e) {
        J.debug("Failed to emit agent.start", {
          error: e
        })
      }
    }
    return this.doRunInferenceSetup()
  }
  async doRunInferenceSetup() {
    if (J.debug("runInferenceAndUpdateThread: begin", {
        threadID: this.threadID,
        inferenceState: this._inferenceState.getValue(),
        messageCount: this.thread.messages.length
      }), this.ops.inference?.abort(), this.ops.inference = null, this._inferenceState.getValue() === "cancelled") this._inferenceState.next("idle");
    let T = new AbortController;
    this.ops.inference = T;
    let R = this.currentAgentSpan?.span;
    await this.toolOrchestrator.onNewUserMessage(), await (this.currentAgentSpan ? this.createTracer(this.currentAgentSpan.span) : Yo).startActiveSpan("inference", {
      context: {
        messageId: this.currentAgentSpan?.messageId
      }
    }, () => this.doRunInferenceAndUpdateThread(T, R))
  }
  async doRunInferenceAndUpdateThread(T, R) {
    try {
      await this.doRunInferenceAndUpdateThreadInner(T, R)
    } catch (a) {
      if (xr(a) || JsT(a)) return;
      throw a
    }
  }
  async doRunInferenceAndUpdateThreadInner(T, R) {
    let a = $h(this.thread);
    if (a && a.totalInputTokens >= a.maxInputTokens) {
      let p = Error("Context limit reached");
      this.ephemeralError.next(p);
      return
    }
    let e = this.thread.messages.at(-1);
    if (this.thread.mainThreadID === void 0 && e?.role === "user" && this.thread.messages.filter((p) => p.role === "user").length === 1) {
      if (this.deps.getThreadEnvironment) this.deps.getThreadEnvironment().then(async (p) => {
        this.updateThread({
          type: "environment",
          env: {
            initial: {
              ...this.thread.env?.initial,
              ...p
            }
          }
        })
      }).catch((p) => {
        J.error("Failed to initialize thread environment", p, {
          threadID: this.threadID
        })
      })
    }
    this.triggerTitleGeneration();
    let t = await this.getConfig(),
      {
        model: r,
        agentMode: h
      } = pn(t.settings, this.thread),
      i = this.thread.messages.at(-1)?.messageId;
    J.debug("runInferenceAndUpdateThread: starting inference", {
      threadID: this.threadID,
      lastUserMessageId: i,
      selectedModel: r,
      agentMode: h
    });
    let c = this.deps.getServerStatus ? await m0(this.deps.getServerStatus().pipe(da((p) => p !== "pending")), T.signal) : void 0,
      s = c && X9(c) ? c.user.email : void 0;
    if (!nN(h, s)) throw Error(`Agent mode '${h}' is only available for internal users`);
    let A = {
        toolService: this.deps.toolService,
        configService: this.deps.configService,
        skillService: this.deps.skillService,
        getThreadEnvironment: this.deps.getThreadEnvironment,
        filesystem: this.fs.fileSystem,
        threadService: this.deps.threadService,
        serverStatus: c
      },
      l, o = 0,
      n = Date.now();
    try {
      let [p, _, m] = r.match(/(.*?)\/(.*)/) ?? [], b = r7R(_ ?? "", m ?? ""), {
        systemPrompt: y,
        tools: u
      } = await LO(A, this.thread, {
        enableTaskList: !1,
        enableTask: !0,
        enableOracle: !0,
        enableChart: !1
      }, {
        model: m ?? "",
        provider: _ ?? "",
        agentMode: h ?? "smart"
      }, T.signal), P = t7R(r, t.settings, h), k = b.stream({
        model: m ?? "",
        thread: this.thread,
        systemPrompt: y,
        tools: u,
        configService: this.deps.configService,
        serverStatus: c,
        signal: T.signal,
        reasoningEffort: P
      });
      this._inferenceState.next("running"), n = Date.now(), J.debug("ThreadWorker inference stream started", {
        threadID: this.threadID,
        lastUserMessageId: i,
        selectedModel: r,
        agentMode: h
      });
      for await (let x of k) o++, l = x, await this.handle({
        type: "assistant:message-update",
        message: x
      });
      if (J.debug("ThreadWorker inference stream finished", {
          threadID: this.threadID,
          streamEventCount: o,
          durationMs: Date.now() - n,
          lastMessageState: l?.state.type,
          lastMessageId: l?.messageId
        }), l) {
        let x = l.state.type === "streaming",
          f = l.content.some((v) => v.type === "tool_use" && v.complete && Object.keys(v.input ?? {}).length === 0);
        if (x || f) J.warn("Stream ended with incomplete message", {
          name: "ThreadWorker.runInference",
          threadID: this.threadID,
          streamEventCount: o,
          durationMs: Date.now() - n,
          messageState: l.state.type,
          stopReason: l.state.type === "complete" ? l.state.stopReason : void 0,
          contentBlocks: l.content.map((v) => ({
            type: v.type,
            ...v.type === "tool_use" ? {
              name: v.name,
              complete: v.complete,
              inputKeys: Object.keys(v.input ?? {})
            } :
            {},
            ...v.type === "text" ? {
              textLength: v.text.length
            } :
            {}
          }))
        })
      }
      await this.handle({
        type: "inference:completed",
        model: l?.usage?.model ?? r,
        usage: l?.usage
      })
    } catch (p) {
      if (J.debug("ThreadWorker inference stream error", {
          threadID: this.threadID,
          error: p instanceof Error ? p.message : String(p),
          errorName: p instanceof Error ? p.name : void 0,
          streamEventCount: o,
          durationMs: Date.now() - n,
          lastMessageState: l?.state.type,
          lastMessageId: l?.messageId
        }), !(xr(p) || JsT(p))) {
        let _ = p instanceof Error ? p : Error(String(p));
        if (dO({
            message: _.message
          })) {
          this.ephemeralError.next(_);
          return
        }
        let m = "status" in _ && typeof _.status === "number" ? _.status : void 0;
        if (vUT({
            message: _.message,
            status: m
          })) {
          let b = this.getRetryDelaySeconds();
          if (b !== void 0) this.startRetryCountdown(b)
        }
        this.ephemeralError.next(_)
      }
      if (l && l.messageId) {
        let _ = await this.deps.pluginService.event.agentEnd({
          message: kr(l.content),
          id: l.messageId,
          status: "error",
          messages: Wq(this.getMessagesSince(l.messageId))
        }, R ? this.createTracer(R) : void 0);
        if (R) this.stopAgentSpan(R);
        this.handleAgentEndResult(_)
      } else if (R) this.stopAgentSpan(R);
      return
    } finally {
      if (this.ops.inference === T) this.ops.inference = null, this._inferenceState.next("idle")
    }
  }
  async findAndCancelToolRun(T, R) {
    this.cancelInference(), await this.toolOrchestrator.findAndCancelToolRun(T, R)
  }
  async cancelToolOnly(T, R) {
    await this.toolOrchestrator.cancelToolOnly(T, R)
  }
  invokeBashTool(T, R, a) {
    return new AR((e) => {
      let t, r, h, i = ((c) => {
        return xN(c, () => {
          if (J.warn("Manual bash abort -> unsubscribe", {
              threadID: this.threadID
            }), h?.unsubscribe(), r?.unsubscribe(), e?.complete(), t) this.handleManualBashInvocation(T, {
            status: "cancelled",
            progress: FD(t)
          }, a)
        })
      })(R);
      return (async () => {
        try {
          if (R.aborted) {
            e.error(Error("Operation was aborted"));
            return
          }
          let c = await this.getWorkspaceRoot(R),
            s = await this.getConfig(R);
          if (this.isDisposed) {
            e.complete();
            return
          }
          let A = {
            ...this.deps,
            dir: c,
            tool: U8,
            thread: this.thread,
            config: s,
            trackedFiles: new Ls(this.trackedFiles),
            filesystem: ymR(this.fs.fileSystem),
            fileChangeTracker: this.fs.tracker,
            getAllTrackedChanges: this.getAllTrackedChanges.bind(this),
            toolUseID: fx(),
            todos: [],
            threadEnvironment: this.thread.env?.initial ?? await this.deps.getThreadEnvironment(),
            handleThreadDelta: this.handle.bind(this),
            discoveredGuidanceFileURIs: this.discoveredGuidanceFileURIs,
            userInitiated: !0
          };
          r = this.deps.toolService.invokeTool(U8, {
            args: T,
            userInput: {
              accepted: !0
            }
          }, A).subscribe({
            next: (l) => {
              t = l, e.next(l)
            },
            error: (l) => {
              e.error(l)
            },
            complete: () => {
              if (t) this.handleManualBashInvocation(T, t, a);
              e.complete()
            }
          }), h = this.disposed$.subscribe(() => {
            i(), r?.unsubscribe(), e?.complete()
          })
        } catch (c) {
          e.error(c)
        }
      })(), () => {
        i(), r?.unsubscribe(), h?.unsubscribe()
      }
    })
  }
  async handleManualBashInvocation(T, R, a) {
    await this.handle({
      type: "info:manual-bash-invocation",
      args: T,
      toolRun: R,
      hidden: a
    })
  }
  async cleanupThreadBackups(T) {
    try {
      await this.fs.tracker.cleanupBackups(), J.debug(`Cleaned up backup files for thread ${T}`, {
        threadID: T
      })
    } catch (R) {
      J.error("Error cleaning up thread backups", R, {
        threadID: T
      })
    }
  }
  async cancel() {
    J.debug("cancel: aborting inference operation and tools"), this.cancelInference(), await this.toolOrchestrator.cancelAll("user:cancelled"), await this.handle({
      type: "cancelled"
    }, void 0)
  }
  cancelInference() {
    if (this.ops.inference) this.ops.inference.abort(Error(u9T.USER_CANCELLED)), this.ops.inference = null;
    this._inferenceState.next("cancelled"), this._turnStartTime.next(void 0), this._turnElapsedMs.next(void 0)
  }
  static BASE_RETRY_SECONDS = 5;
  static MAX_RETRY_SECONDS = 60;
  static MAX_AUTO_RETRIES = 5;
  getRetryDelaySeconds() {
    if (this.ephemeralErrorRetryAttempt >= ov.MAX_AUTO_RETRIES) return;
    let T = ov.BASE_RETRY_SECONDS * 2 ** this.ephemeralErrorRetryAttempt;
    return Math.min(T, ov.MAX_RETRY_SECONDS)
  }
  async retry() {
    if (J.debug("retry: retrying inference operation"), this.clearRetryCountdown(), this.ephemeralError.getValue() !== void 0) this.ephemeralErrorRetryAttempt++, this.ephemeralError.next(void 0);
    if (this.ops.inference) this.ops.inference.abort(), this.ops.inference = null;
    let T = this.thread.messages.at(-1);
    if (T?.role === "assistant" && (T.state.type !== "complete" || T.state.stopReason === "refusal")) this.updateThread({
      type: "thread:truncate",
      fromIndex: this.thread.messages.length - 1
    });
    this._inferenceState.next("idle"), await this.runInferenceAndUpdateThread()
  }
  resetRetryAttempts() {
    this.ephemeralErrorRetryAttempt = 0
  }
  dismissEphemeralError() {
    this.clearRetryCountdown(), this.ephemeralError.next(void 0), this.ephemeralErrorRetryAttempt = 0
  }
  clearRetryCountdown() {
    if (this.retrySession++, this.retryTimer !== null) clearInterval(this.retryTimer), this.retryTimer = null;
    this.retryCountdownSeconds.next(void 0)
  }
  startRetryCountdown(T) {
    this.clearRetryCountdown();
    let R = this.retrySession,
      a = Date.now() + T * 1000;
    this.retryCountdownSeconds.next(T), this.retryTimer = setInterval(() => {
      if (R !== this.retrySession) return;
      let e = Math.max(0, Math.ceil((a - Date.now()) / 1000));
      if (e <= 0) this.clearRetryCountdown(), this.retry().catch((t) => {
        J.error("Auto-retry failed", {
          error: t
        })
      });
      else this.retryCountdownSeconds.next(e)
    }, 1000)
  }
  addPendingSkill(T) {
    J.debug("addPendingSkill", {
      threadID: this.threadID,
      skillName: T.name
    });
    let R = this._pendingSkills.getValue();
    if (!R.some((a) => a.name === T.name)) this._pendingSkills.next([...R, T])
  }
  removePendingSkill(T) {
    J.debug("removePendingSkill", {
      threadID: this.threadID,
      skillName: T
    });
    let R = this._pendingSkills.getValue();
    this._pendingSkills.next(R.filter((a) => a.name !== T))
  }
  clearPendingSkills() {
    J.debug("clearPendingSkills", {
      threadID: this.threadID
    }), this._pendingSkills.next([])
  }
  getPendingSkills() {
    return this._pendingSkills.getValue()
  }
  setTestEphemeralError(T) {
    this.ephemeralError.next(T)
  }
  trackFiles(T) {
    for (let R of T) this.trackedFiles.add(R)
  }
  async restoreFileChangesFromBackups() {
    try {
      let T = await this.fs.tracker.restoreFromBackups();
      J.debug(`Restored ${T.totalBackups} backup files from disk`), await this.updateFileChanges()
    } catch (T) {
      J.error("Error restoring file changes", T, {
        threadID: this.threadID
      })
    }
  }
  async revertFileChanges(T) {
    await this.fs.tracker.revertAll(T), await this.updateFileChanges()
  }
  async getAllTrackedChanges() {
    return this.fs.tracker.getAllRecords()
  }
  async cleanupForkThreads(T = this.thread.messages.length) {
    await this.acquireThread(), this.updateThread({
      type: "thread:truncate",
      fromIndex: T
    })
  }
  async getToolUsesToRevert(T = this.thread.messages.length) {
    let R = new Set;
    this.thread.messages.slice(0, T).forEach((t) => {
      if (t.role === "user") {
        for (let r of t.content)
          if (r.type === "tool_result") R.add(r.toolUseID)
      } else
        for (let r of t.content)
          if (r.type === "tool_use") R.add(r.id)
    });
    let a = new Set,
      e = await this.fs.tracker.getAllRecords();
    for (let [t] of e.entries())
      if (!R.has(t)) a.add(t);
    return a
  }
  async getFilesAffectedByTruncation(T) {
    let R = await this.getToolUsesToRevert(T);
    return R.size > 0 ? this.fs.tracker.getFilesForToolUses(R) : []
  }
  async cleanupFileChanges(T = this.thread.messages.length) {
    let R = await this.getToolUsesToRevert(T);
    if (R.size === 0) return;
    await this.fs.tracker.revertChanges(R), await this.updateFileChanges()
  }
  async performMessageEditCleanup(T) {
    if (await this.toolOrchestrator.cancelAll("system:edited"), !await this.isAutoSnapshotEnabled()) await this.cleanupFileChanges();
    await this.cleanupForkThreads()
  }
  async updateFileChanges() {
    if (await this.isAutoSnapshotEnabled()) return;
    this.cachedFileChanges = await $7T(this.fs.tracker), this.fileChanges.next({
      files: this.cachedFileChanges
    })
  }
  async injectPendingSkills(T, R) {
    let a = T.map((e) => e.name);
    J.info("Adding info message to prompt skill invocation", {
      threadID: this.threadID,
      skillNames: a
    }), this._awaitingSkillInvocation.next(T), this.thread = Lt(this.thread, (e) => {
      let t = e.nextMessageId ?? 0;
      e.nextMessageId = t + 1, e.messages.push({
        role: "info",
        messageId: t,
        content: [{
          type: "text",
          text: `You MUST call the ${oc} tool to load: ${a.join(", ")}. Do this immediately before responding.`
        }]
      }), e.v++
    })
  }
  checkAndAppendAwaitedSkills() {
    let T = this._awaitingSkillInvocation.getValue();
    if (T.length === 0) return;
    this._awaitingSkillInvocation.next([]);
    let {
      updatedThread: R,
      uninvoked: a
    } = YwR(this.thread, {
      toolName: oc,
      items: T,
      wasInvoked: (e, t) => e.some((r) => r.name === oc && r.input.name === t.name),
      toToolInput: (e) => ({
        name: e.name,
        arguments: e.arguments
      })
    });
    if (a.length > 0) J.info("Skills not invoked by model, appending tool_use blocks", {
      threadID: this.threadID,
      uninvokedSkills: a.map((e) => e.name)
    }), this.thread = R
  }
  async executeHandoff(T) {
    J.info("Executing handoff", {
      threadID: this.threadID,
      goal: T
    }), this.handoffState.next({
      goal: T
    });
    try {
      let {
        threadWorkerService: R
      } = await Promise.resolve().then(() => (op(), YWT)), a = {
        toolService: this.deps.toolService,
        configService: this.deps.configService,
        skillService: this.deps.skillService,
        getThreadEnvironment: this.deps.getThreadEnvironment,
        filesystem: this.fs.fileSystem,
        threadService: this.deps.threadService
      }, {
        threadID: e
      } = await R.handoff(this.deps, {
        threadID: this.threadID,
        goal: T,
        images: [],
        mode: "initial",
        agentMode: this.thread.agentMode,
        queuedMessages: this.thread.queuedMessages,
        clearQueuedMessages: !0,
        blockIndex: 0,
        buildSystemPromptDeps: a
      });
      J.info("Handoff thread created and running in background", {
        fromThreadID: this.threadID,
        newThreadID: e,
        goal: T
      }), this.handoffState.next({
        goal: T,
        result: {
          newThreadID: e
        }
      })
    } catch (R) {
      J.error("Handoff failed", R, {
        threadID: this.threadID,
        goal: T
      }), this.handoffState.next({
        goal: T,
        result: {
          error: R instanceof Error ? R.message : String(R)
        }
      })
    }
  }
  continueInferenceAfterRejection(T = !0) {
    this.shouldContinueAfterRejection = T
  }
  getTurnStartTime() {
    return this._turnStartTime.getValue()
  }
  setTurnStartTime(T) {
    this._turnStartTime.next(T)
  }
  async asyncDispose() {
    if (this.isDisposed) return;
    if (J.debug("ThreadWorker disposal starting", {
        name: "ThreadWorker.dispose",
        threadID: this.threadID,
        activeToolCount: this.toolOrchestrator.getRunningToolIds().length
      }), this.isDisposed = !0, await this.toolOrchestrator.cancelAll("system:disposed"), this.disposed$.next(), this.disposed$.complete(), this.clearRetryCountdown(), this._state.complete(), this.ephemeralError.complete(), this._inferenceState.complete(), this.fileChanges.complete(), this.toolCallUpdates.complete(), this.retryCountdownSeconds.complete(), this.toolOrchestrator.dispose(), this.ops.inference) this.ops.inference.abort(), this.ops.inference = null;
    if (this.ops.titleGeneration) this.ops.titleGeneration.abort(), this.ops.titleGeneration = null;
    if (this.fs.tracker.dispose(), this.threadReadWriter) await this.threadReadWriter.asyncDispose(), this.threadReadWriter = null
  }
  async getSelectedAgentMode() {
    let T = await this.getConfig(),
      {
        agentMode: R
      } = pn(T.settings, this.thread);
    return R
  }
}

function QwR(T, R, a = !1) {
  let e = dt(T, "assistant");
  if (!e || e.state.type !== "complete" || e.state.stopReason !== "tool_use") return !1;
  let t = e.content.filter((h) => h.type === "tool_use").map((h) => h.id);
  if (R && !t.includes(R)) return J.debug(`tool:data for orphaned tool_use ${R} - ignoring for inference`, {
    name: "shouldRunInferenceWithToolData",
    threadID: T.id
  }), !1;
  if (t.length === 0) return !1;
  let r = sA(T);
  if (!t.every((h) => {
      let i = r.get(h);
      if (!i?.run || !wt(i.run.status)) return !1;
      let c = i.run.status;
      if (c === "cancelled") {
        let s = i.run.reason;
        return s ? !s.startsWith("user:") : !1
      }
      if (c === "rejected-by-user") return a;
      return !0
    })) return !1;
  if (t.every((h) => {
      let i = r.get(h);
      if (!i || i.run.status !== "done") return !1;
      return i.run.isFinal === !0
    })) return !1;
  return !0
}
class QWT {
  threadWorkers = new tET;
  async getOrCreateForThread(T, R) {
    let a = this.threadWorkers.get(R);
    if (!a) {
      if (a = new ov(T, R), this.threadWorkers.set(R, a), this.threadWorkers.size > 25) J.info("Many active thread workers detected", {
        name: "ThreadWorkerService.memoryCheck",
        threadID: R,
        totalWorkerCount: this.threadWorkers.size
      })
    }
    return sM.record(this.threadWorkers.size), a
  }
  async createThreadWorker(T, R) {
    let a = await this.getOrCreateForThread(T, R);
    return await a.resume(), a
  }
  async seedThreadMessages(T, R, a, e) {
    let t = await T.threadService.exclusiveSyncReadWriter(R),
      r = e ? a.map((c) => c.role === "user" ? {
          ...c,
          agentMode: e
        } :
        c) : [...a],
      h = r.length > 0 ? Math.max(...r.map((c) => c.messageId)) + 1 : 0,
      i = t.read();
    t.write({
      ...i,
      agentMode: e ?? i.agentMode,
      messages: r,
      nextMessageId: h,
      v: i.v + 1
    }), await t.asyncDispose()
  }
  async applyParentRelationship(T, R, a, e) {
    let t = Date.now(),
      {
        threadID: r,
        type: h,
        messageIndex: i,
        blockIndex: c,
        comment: s
      } = e;
    await R.handle({
      type: "relationship",
      relationship: {
        threadID: r,
        type: h,
        role: "child",
        messageIndex: i,
        blockIndex: c,
        createdAt: t,
        comment: s
      }
    });
    let A = {
        threadID: a,
        type: h,
        role: "parent",
        messageIndex: i,
        blockIndex: c,
        createdAt: t,
        comment: s
      },
      l = this.threadWorkers.get(r);
    if (l) await l.handle({
      type: "relationship",
      relationship: A
    });
    else {
      let o = await T.threadService.exclusiveSyncReadWriter(r);
      o.update((n) => {
        if (!n.relationships) n.relationships = [];
        if (!n.relationships.some((p) => p.threadID === A.threadID && p.type === A.type && p.role === A.role)) n.relationships.push(A)
      }), await o.asyncDispose()
    }
  }
  async inheritVisibilityIfNeeded(T, R, a) {
    if (R.type === "handoff") await O4R(T.threadService, R.threadID, a)
  }
  async sendInitialUserMessage(T, R) {
    let a = typeof R === "string" ? [{
      type: "text",
      text: R
    }] : [...R];
    await T.handle({
      type: "user:message",
      message: {
        content: a
      }
    })
  }
  async setDraftContent(T, R) {
    let a = typeof R === "string" ? R : [...R];
    await T.handle({
      type: "draft",
      content: a
    })
  }
  async setPendingNavigation(T, R) {
    let a = this.threadWorkers.get(T);
    if (a) await a.handle({
      type: "setPendingNavigation",
      threadID: R
    })
  }
  async transferQueuedMessages(T, R) {
    for (let a of R) await T.handle({
      type: "user:message-queue:enqueue",
      message: a.queuedMessage
    })
  }
  async createThread(T, R) {
    let a = R?.newThreadID ?? Eh(),
      e = R?.agentMode,
      t = !1;
    if (R?.seededMessages) await this.seedThreadMessages(T, a, R.seededMessages, e), t = !0;
    let r = await this.createThreadWorker(T, a);
    if (r.thread.messages.length > 0 && !t) return J.info("createThread called for existing thread, returning existing worker", {
      threadID: a,
      messageCount: r.thread.messages.length
    }), {
      threadID: a,
      worker: r
    };
    if (e && !t) await r.handle({
      type: "agent-mode",
      mode: e
    });
    if (R?.parent) await this.applyParentRelationship(T, r, a, R.parent), await this.inheritVisibilityIfNeeded(T, R.parent, a);
    if (R?.initialUserMessage) {
      if (t) throw Error("initialUserMessage cannot be set when seededMessages is provided");
      await this.sendInitialUserMessage(r, R.initialUserMessage)
    }
    if (R?.draftContent) {
      if (t) throw Error("draftContent cannot be set when seededMessages is provided");
      await this.setDraftContent(r, R.draftContent)
    }
    if (R?.navigate && R?.parent) await this.setPendingNavigation(R.parent.threadID, a);
    if (R?.queuedMessages) await this.transferQueuedMessages(r, R.queuedMessages);
    return {
      threadID: a,
      worker: r
    }
  }
  async handoff(T, R) {
    let a = await this.createThreadWorker(T, R.threadID),
      e = a.thread,
      t = R.images ?? [],
      r = R.signal ?? new AbortController().signal,
      {
        content: h
      } = await $4R({
        thread: e,
        goal: R.goal,
        images: t,
        deps: {
          configService: T.configService,
          buildSystemPromptDeps: R.buildSystemPromptDeps,
          signal: r,
          filesystem: R.filesystem,
          deadline: R.deadline
        }
      }),
      i = typeof h === "string" ? h : h.filter((A) => A.type === "text" || A.type === "image"),
      c = {
        threadID: R.threadID,
        type: "handoff",
        messageIndex: R.messageIndex ?? (e.messages.length ? e.messages.length - 1 : void 0),
        blockIndex: R.blockIndex,
        comment: R.comment ?? R.goal
      },
      s = await this.createThread(T, {
        newThreadID: R.newThreadID,
        agentMode: R.agentMode ?? e.agentMode,
        parent: c,
        navigate: R.navigate,
        queuedMessages: R.queuedMessages ?? e.queuedMessages,
        initialUserMessage: R.mode === "initial" ? i : void 0,
        draftContent: R.mode === "draft" ? i : void 0
      });
    if (R.clearQueuedMessages && e.queuedMessages?.length) await a.handle({
      type: "user:message-queue:discard"
    });
    return s
  }
  get workers() {
    return this.threadWorkers.observable
  }
  get statuses() {
    return this.threadWorkers.observable.pipe(L9((T) => T.size === 0 ? AR.of({}) : v3(...Array.from(T.values()).map((R) => R.status.pipe(JR((a) => [R.threadID, R.threadReadWriter ? f3T(R.thread, a) : void 0])))).pipe(JR((R) => Object.fromEntries(R)))), KS(25), f3())
  }
  get(T) {
    return this.threadWorkers.get(T)
  }
  prettyPrintToolRun(T, R) {
    let a = this.threadWorkers.get(T);
    if (!a) throw Error(`No worker found for thread ${T}`);
    for (let e of a.thread.messages)
      for (let t of e.content)
        if (t.type === "tool_result" && t.toolUseID === R) return AIR(t.run);
    throw Error(`Tool run not found for thread ${T} and tool use ${R}`)
  }
  async cancelToolOnly(T, R) {
    await this.threadWorkers.get(T)?.cancelToolOnly(R)
  }
  async cancel(T) {
    await this.threadWorkers.get(T)?.cancel()
  }
  async dispose(T) {
    let R = this.threadWorkers.get(T);
    if (R) await R.cancel(), await R.asyncDispose(), this.threadWorkers.delete(T), sM.record(this.threadWorkers.size)
  }
  async retry(T) {
    let R = this.threadWorkers.get(T);
    if (!R) throw Error(`No active worker for thread ${T}`);
    await R.retry()
  }
  async revertFileChanges(T, R) {
    let a = this.threadWorkers.get(T);
    if (!a) throw Error(`No active worker for thread ${T}`);
    await a.revertFileChanges(R)
  }
  async getFilesAffectedByTruncation(T, R) {
    let a = this.threadWorkers.get(T);
    if (!a) throw Error(`No active worker for thread ${T}`);
    return a.getFilesAffectedByTruncation(R)
  }
  async cleanupThreadBackups(T, R) {
    let a = this.threadWorkers.get(R);
    if (a) await a.fs.tracker.cleanupBackups();
    else try {
      await new Im(T.osFileSystem).cleanup(R), J.debug(`Cleaned up backup files for thread ${R}`, {
        threadID: R
      })
    }
    catch (e) {
      J.error("Error cleaning up thread backups", e, {
        threadID: R
      })
    }
  }
  async disposeAll() {
    await Promise.all(Array.from(this.threadWorkers.values()).map(async (T) => await T.asyncDispose())), this.threadWorkers.clear(), sM.record(0)
  }
}

function kBR(T) {
  return `${T.description}
\`\`\`json
${JSON.stringify(T.args)}
\`\`\``
}

function wh(T) {
  return `# Examples

` + T.map(kBR).join(`

`)
}
async function gBR(T, R, a) {
  try {
    let e;
    try {
      e = mi(T)
    } catch (r) {
      return {
        error: `Save path must be absolute: ${r instanceof Error?r.message:String(r)}`
      }
    }
    let t = d0(e);
    try {
      if ((await R.stat(e, {
          signal: a
        })).isDirectory) return {
        error: `Save path is a directory: ${t}`
      };
      return {
        error: `Save path already exists: ${t}`
      }
    } catch (r) {
      if (!Er(r)) return {
        error: `Failed to check save path: ${r instanceof Error?r.message:String(r)}`
      }
    }
    try {
      if (!(await R.stat(MR.dirname(e), {
          signal: a
        })).isDirectory) return {
        error: `Save path parent is not a directory: ${t}`
      }
    } catch (r) {
      if (!Er(r)) return {
        error: `Failed to check save path parent: ${r instanceof Error?r.message:String(r)}`
      }
    }
    return {
      uri: e,
      uriString: t
    }
  } catch (e) {
    return {
      error: `Failed to parse savePath: ${e instanceof Error?e.message:String(e)}`
    }
  }
}

function SBR(T, R, a) {
  J.debug("REPL: Spawning process", {
    binary: T,
    args: R,
    cwd: a
  });
  let e = jBR(T, R, {
      cwd: a,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...globalThis.process.env
      }
    }),
    t = [],
    r = [],
    h = [],
    i = [],
    c = !1;
  return e.on("spawn", () => {
    c = !0;
    for (let s of i) s()
  }), e.on("error", (s) => {
    for (let A of h) A(s)
  }), e.stdout?.on("data", (s) => {
    let A = s.toString();
    for (let l of t) l(A)
  }), e.stderr?.on("data", (s) => {
    let A = s.toString();
    for (let l of t) l(A)
  }), e.on("exit", (s) => {
    for (let A of r) A({
      exitCode: s
    })
  }), e.stdin?.on("error", (s) => {
    J.debug("REPL stdin error", {
      error: s.message
    });
    for (let A of h) A(s)
  }), {
    write: (s) => {
      if (e.stdin?.writable) try {
        return e.stdin.write(s)
      }
      catch (A) {
        return J.debug("REPL write error", {
          error: A
        }), !1
      }
      return !1
    },
    kill: (s) => {
      if (!e.killed) e.kill(s ?? "SIGTERM")
    },
    onData: (s) => t.push(s),
    onExit: (s) => r.push(s),
    onError: (s) => {
      h.push(s)
    },
    onReady: (s) => {
      if (c) s();
      else i.push(s)
    }
  }
}
async function OBR(T, R, a, e, t, r, h) {
    let {
      binary: i,
      args: c = [],
      objective: s,
      replDescription: A,
      workingDirectory: l,
      initialOutputTimeoutMs: o
    } = T, n = l ?? R.dir?.fsPath ?? globalThis.process.cwd();
    if (!Nx.existsSync(n)) {
      a.next({
        status: "error",
        error: {
          message: `Working directory does not exist: ${n}`
        }
      }), a.complete();
      return
    }
    let p = Eh(),
      _ = R,
      m = await ct.getOrCreateForThread(_, p),
      b = m.status.pipe(da((aT) => aT.state === "active")).subscribe((aT) => {
        if (aT.state === "active" && aT.ephemeralError) J.error("REPL subthread ephemeral error", {
          error: aT.ephemeralError
        })
      });
    h(b), await m.handle({
      type: "main-thread",
      value: R.thread.id
    }), await m.handle({
      type: "title",
      value: `repl(${i}): ${dBR(s,50)}`
    });
    let y = R.agentMode || Jy(R.config.settings);
    if (await m.handle({
        type: "agent-mode",
        mode: y
      }), R.threadEnvironment) await m.handle({
      type: "environment",
      env: {
        initial: R.threadEnvironment
      }
    });
    let u = CBR(n),
      P = EBR(A, s, u),
      k;
    try {
      k = SBR(i, c, n), t(k)
    } catch (aT) {
      a.next({
        status: "error",
        progress: {
          threadID: p
        },
        error: {
          message: `Failed to start REPL process: ${aT}`
        }
      }), a.complete();
      return
    }
    let x = {
      error: null
    };
    k.onError((aT) => {
      x.error = aT
    });
    let f = await Promise.race([new Promise((aT) => k.onReady(() => aT("ready"))), new Promise((aT) => k.onError(() => aT("error"))), new Promise((aT) => setTimeout(() => aT("timeout"), EmT))]);
    if (f === "error" || x.error) {
      a.next({
        status: "error",
        progress: {
          threadID: p
        },
        error: {
          message: `Failed to spawn REPL process "${i}": ${x.error?.message??"Unknown error"}. Check that the binary exists and is executable.`
        }
      }), a.complete();
      return
    }
    if (f === "timeout") {
      k.kill(), a.next({
        status: "error",
        progress: {
          threadID: p
        },
        error: {
          message: `REPL process "${i}" failed to start within ${EmT}ms.`
        }
      }), a.complete();
      return
    }
    let v = [],
      g = 0,
      I = !1;
    k.onData((aT) => {
      if (I) return;
      if (g += aT.length, g > OmT) {
        I = !0, J.warn("REPL output buffer overflow", {
          size: g
        });
        return
      }
      v.push(aT)
    });
    let S = !1,
      O = null,
      j = {
        error: null
      };
    k.onExit(({
      exitCode: aT
    }) => {
      J.debug("REPL process exited", {
        exitCode: aT
      }), S = !0, O = aT
    }), k.onError((aT) => {
      j.error = aT
    });
    let d = async (aT) => {
          let oT = Date.now()