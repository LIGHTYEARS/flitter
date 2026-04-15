function M5R(T) {
  if (typeof T.source === "object" && "toolbox" in T.source) return T.source.toolbox;
  if (typeof T.source === "object" && "mcp" in T.source) return T.source.mcp;
  throw Error(`Cannot extract executable path from ${T.source}`);
}