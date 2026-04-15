function v7R(T) {
  return ["", "---", "", "# Tools", "", "## mcp", "namespace mcp {", ...j7R(T, "\t"), "} // namespace mcp", "", 'Example call: {"name":"mcp__server__tool","arguments":{}}'];
}
function j7R(T, R) {
  let a = [];
  for (let e of T) {
    if (e.description) for (let r of e.description.split(`
`).filter(Boolean)) a.push(`${R}// ${r}`);
    let t = S7R(e.name, e.inputSchema, R);
    a.push(...t, "");
  }
  if (a.at(-1) === "") a.pop();
  return a;
}