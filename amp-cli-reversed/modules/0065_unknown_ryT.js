function tyT(T, R) {
  let a = T.split(`
`);
  if (a.length <= R) return T;
  return a.slice(0, R).join(`
`) + `
... (${a.length - R} more lines)`;
}
function ryT(T, R) {
  let {
      input: a,
      result: e
    } = T,
    t = [];
  if (!a || typeof a !== "object") t.push(T.tool_name);else switch (T.tool_name) {
    case "edit_file":
    case "create_file":
      if (a.path) t.push(`${T.tool_name}(${a.path})`);else t.push(T.tool_name);
      break;
    case "Read":
      if (a.path) t.push(`Read(${a.path})`);else t.push("Read");
      break;
    case "Grep":
      if (a.pattern) {
        let r = a.path ? ` in ${a.path}` : "";
        t.push(`Grep("${a.pattern}"${r})`);
      } else t.push("Grep");
      break;
    case "Bash":
      if (a.cmd) {
        let r = String(a.cmd).length > eyT ? String(a.cmd).substring(0, eyT - 3) + "..." : a.cmd;
        t.push(`Bash("${r}")`);
      } else t.push("Bash");
      break;
    case "glob":
      if (a.filePattern) t.push(`glob("${a.filePattern}")`);else t.push("glob");
      break;
    default:
      t.push(T.tool_name);
  }
  if (R && e && T.status === "done") switch (T.tool_name) {
    case "edit_file":
    case "create_file":
      {
        let r = typeof e === "string" ? e : typeof e.diff === "string" ? e.diff : null;
        if (r) t.push(`
Diff:
${tyT(r, cXR)}`);
        break;
      }
    case "Bash":
      {
        if (e.output) {
          let r = e.exitCode !== void 0 ? ` (exit ${e.exitCode})` : "";
          t.push(`${r}
Output:
${tyT(String(e.output), sXR)}`);
        }
        break;
      }
  }
  return t.join("");
}