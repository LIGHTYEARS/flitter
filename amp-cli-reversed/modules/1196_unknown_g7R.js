function g7R(T) {
  let R = ["", "---", "", "## MCP Tools", "", "The following MCP tools are available with this skill. Use them by calling the tool with the specified name and parameters.", "", "<skill_tools>"];
  for (let a of T) {
    if (R.push(`<tool name="${a.name}">`), a.description) R.push(`<description>${a.description}</description>`);
    let e = Tb(a.inputSchema);
    R.push("<parameters>"), R.push(...e.map(r => `  ${r}`)), R.push("</parameters>");
    let t = o$(a.inputSchema);
    R.push(`<example>${JSON.stringify(t)}</example>`), R.push("</tool>"), R.push("");
  }
  return R.push("</skill_tools>"), R;
}