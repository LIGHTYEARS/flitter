function $C0(T) {
  return Object.fromEntries(Object.entries(T).map(([R, a]) => [R, gC0(a)]));
}
async function EC0(T) {
  let R;
  if (T.trim().startsWith("{")) R = T;else {
    let {
      readFile: t
    } = await import("fs/promises");
    try {
      R = await t(T, "utf-8");
    } catch (r) {
      throw new GR(`Failed to read --mcp-config file: ${r instanceof Error ? r.message : String(r)}`);
    }
  }
  let a;
  try {
    a = JSON.parse(R);
  } catch (t) {
    throw new GR(`Failed to parse --mcp-config as JSON: ${t instanceof Error ? t.message : String(t)}`);
  }
  let e;
  try {
    e = dC0.parse(a);
  } catch (t) {
    if (t instanceof K.ZodError) {
      let r = t.issues.map(h => `${h.path.join(".")}: ${h.message}`).join(", ");
      throw new GR(`Invalid MCP server configuration: ${r}`);
    }
    throw new GR(`Failed to validate MCP server configuration: ${String(t)}`);
  }
  return $C0(e);
}