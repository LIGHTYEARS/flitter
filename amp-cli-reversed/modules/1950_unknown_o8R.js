function o8R(T) {
  if (!T) return "none";
  let R = T.tools.map(e => {
      let t = e.toolUse.normalizedName ?? e.toolUse.name,
        r = e.toolProgress?.status ?? "none";
      return `${e.toolUse.id}|${t}|${e.toolRun.status}|${r}`;
    }).join("|"),
    a = T.terminalAssistantMessage ? Q50(T.terminalAssistantMessage) : "no-message";
  return `tools:${R}|assistant:${a}`;
}