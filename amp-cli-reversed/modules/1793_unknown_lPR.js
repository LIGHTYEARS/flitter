function lPR(T) {
  let R = T.command.toLowerCase(),
    a = T.args?.join(" ").toLowerCase() ?? "";
  if (R.includes("mcp-remote") || a.includes("mcp-remote")) return !0;
  if ((R === "npx" || R === "bunx") && a.includes("mcp-remote")) return !0;
  return !1;
}