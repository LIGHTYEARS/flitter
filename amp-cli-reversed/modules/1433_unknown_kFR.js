async function kFR(T, R) {
  let a = (await (await ep({
    configService: R
  }, AbortSignal.timeout(30000))).messages.create({
    model: mb,
    max_tokens: 2000,
    temperature: 0,
    system: `You generate git commands to list changed files. Output commands wrapped in <command></command> tags.

Use "git diff --name-only --diff-filter=AM" for tracked files.
Use "git ls-files --others --exclude-standard" for untracked files when appropriate.

Examples:
- "changes since main" \u2192
<command>git diff --name-only --diff-filter=AM main</command>

- "uncommitted changes" \u2192
<command>git diff --name-only --diff-filter=AM</command>
<command>git ls-files --others --exclude-standard</command>

- "changes in last commit" \u2192
<command>git diff --name-only --diff-filter=AM HEAD~1</command>

- "changes between v1.0 and v2.0" \u2192
<command>git diff --name-only --diff-filter=AM v1.0..v2.0</command>

- "staged changes" \u2192
<command>git diff --name-only --diff-filter=AM --cached</command>

Output only the command tags, no explanation.`,
    messages: [{
      role: "user",
      content: T
    }]
  })).content.find(t => t.type === "text");
  if (!a || a.type !== "text") return [["diff", "--name-only", "--diff-filter=AM"]];
  let e = Lk(a.text, "command");
  return jzT(e);
}