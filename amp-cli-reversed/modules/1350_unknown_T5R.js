function T5R(T) {
  let {
      input: R,
      result: a
    } = T,
    e = [];
  if (e.push(`
### ${T.tool_name} (${T.status})`), R) switch (T.tool_name) {
    case "edit_file":
    case "create_file":
      if (R.path) e.push(`
**Path:** \`${R.path}\``);
      break;
    case "Read":
      if (R.path) e.push(`
**Path:** \`${R.path}\``);
      break;
    case "Grep":
      if (e.push(`
**Pattern:** \`${R.pattern}\``), R.path) e.push(` in \`${R.path}\``);
      break;
    case "Bash":
      if (R.cmd) {
        let t = String(R.cmd).length > 200 ? String(R.cmd).substring(0, 200) + "..." : R.cmd;
        e.push(`
**Command:** \`${t}\``);
      }
      break;
    case "glob":
      if (R.filePattern) e.push(`
**Pattern:** \`${R.filePattern}\``);
      break;
  }
  if (T.status === "done" && a) switch (T.tool_name) {
    case "edit_file":
    case "create_file":
      {
        let t = typeof a === "string" ? a : typeof a.diff === "string" ? a.diff : null;
        if (t) {
          let r = vuT(t, 500);
          e.push(`
**Diff:**
\`\`\`diff
${r}
\`\`\``);
        }
        break;
      }
    case "Bash":
      {
        if (a.output) {
          let t = vuT(String(a.output), 300);
          e.push(`
**Output:**
\`\`\`
${t}
\`\`\``);
        }
        break;
      }
  }
  return e.join("");
}