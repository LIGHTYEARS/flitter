async function A40(T, R) {
  let a = (await (await ep({
    configService: R
  }, AbortSignal.timeout(30000))).messages.create({
    model: mb,
    max_tokens: 2000,
    temperature: 0,
    system: `You generate git diff commands that show the actual diff content. Output commands in XML format: <command>git diff ...</command>

The commands should use "git diff" to show the full diff output. You may output multiple commands if needed.

Examples:
- "changes since main" \u2192 <command>git diff main</command>
- "uncommitted changes" \u2192 <command>git diff HEAD</command>
- "changes in last commit" \u2192 <command>git diff HEAD~1</command>
- "changes between v1.0 and v2.0" \u2192 <command>git diff v1.0..v2.0</command>
- "staged changes" \u2192 <command>git diff --cached</command>
- "all uncommitted including untracked" \u2192 <command>git diff HEAD</command><command>git ls-files --others --exclude-standard</command>

Output only the command tags, no explanation.`,
    messages: [{
      role: "user",
      content: T
    }]
  })).content.find(r => r.type === "text");
  if (!a || a.type !== "text") return SIT;
  let e = Lk(a.text, "command"),
    t = jzT(e);
  return t.length > 0 ? t : SIT;
}