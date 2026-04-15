function HkR(T) {
  let R = JSON.parse(T);
  if (R["amp.mcpServers"] && typeof R["amp.mcpServers"] === "object") return R["amp.mcpServers"];
  let a = {};
  for (let [e, t] of Object.entries(R)) if (t && typeof t === "object") {
    let r = t;
    if ("command" in r || "url" in r) a[e] = t;
  }
  return a;
}