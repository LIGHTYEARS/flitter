function FNR(T) {
  let R = a => {
    if (a.type === "focus") ZqT = a.focused;
  };
  T.onFocus(R);
}
function dX() {
  return ZqT;
}
function GNR(T, R = 300000) {
  R5T = R, nv = Date.now(), T.onKey(() => {
    nv = Date.now();
  }), T.onMouse(() => {
    nv = Date.now();
  });
}
function T5T() {
  return Date.now() - nv >= R5T;
}
function iUR(T, R) {
  let a = T.status,
    e = [];
  if (T.spec._target === "flag") e.push("--mcp-config flag");else if (T.spec._target === "workspace") e.push(R ? "workspace: trusted" : "workspace: untrusted");else e.push("user settings");
  if (T.requiresApproval) e.push("server: untrusted");
  let t = e.length > 0 ? ` (${e.join(", ")})` : "";
  switch (a.type) {
    case "failed":
      {
        let r = `${T.name}${t}: error - ${a.error.message || "Unknown error"}`;
        if (a.error.stderr) r += `
${a.error.stderr}`;
        return r;
      }
    case "connected":
      {
        let r = T.tools;
        if (r instanceof Error) return `${T.name}${t}: error loading tools - ${r.message}`;
        if (r.length === 0) return `${T.name}${t}: connected (no tools)`;
        let h = r.map(i => i.spec.name).join(", ");
        return `${T.name}${t}: connected (${r.length} tools: ${h})`;
      }
    case "connecting":
      return `${T.name}${t}: connecting...`;
    case "reconnecting":
      return `${T.name}${t}: reconnecting (attempt ${a.attempt}, retry in ${a.nextRetryMs}ms)...`;
    case "authenticating":
      return `${T.name}${t}: authenticating (waiting for OAuth)...`;
    case "awaiting-approval":
      return `${T.name}${t}: awaiting approval`;
    case "denied":
      return `${T.name}${t}: denied by user`;
    case "blocked-by-registry":
      return `${T.name}${t}: blocked by workspace MCP registry`;
  }
}