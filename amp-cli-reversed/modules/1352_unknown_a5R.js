function a5R(T) {
  let R = [],
    a = [],
    e = [];
  for (let r of T) for (let [, h] of r.activeTools) {
    if (h.status !== "done") continue;
    let i = h.input;
    switch (h.tool_name) {
      case "edit_file":
      case "create_file":
        if (i?.path) R.push(`- ${h.tool_name}: \`${i.path}\``);
        break;
      case "Bash":
        if (i?.cmd) {
          let c = String(i.cmd).substring(0, 60);
          a.push(`- \`${c}${String(i.cmd).length > 60 ? "..." : ""}\``);
        }
        break;
      default:
        e.push(h.tool_name);
    }
  }
  let t = [`## Work completed before error:
`];
  if (R.length > 0) t.push("**File changes:**"), t.push(...R), t.push("");
  if (a.length > 0) t.push("**Commands run:**"), t.push(...a), t.push("");
  if (e.length > 0) {
    let r = [...new Set(e)];
    t.push(`**Other tools used:** ${r.join(", ")}`);
  }
  return t.join(`
`);
}