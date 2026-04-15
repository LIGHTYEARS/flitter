function KQ(T) {
  if (T.type === "message") {
    let t = T.message;
    if (t.role === "user") {
      let h = kr(t.content),
        i = t.content.filter(s => s.type === "image").length,
        c = (t.discoveredGuidanceFiles ?? []).map(s => `${s.uri}|${s.lineCount}`).join("||");
      return `${T.id}|user|${t.interrupted ? 1 : 0}|${i}|${h}|${c}`;
    }
    if (t.role === "assistant") {
      let h = t.state?.type ?? "none",
        i = t.content.filter(o => o.type === "thinking"),
        c = t.content.filter(o => o.type === "tool_use"),
        s = i.map(o => {
          return `${tf(o.thinking).length}:${Xm(o) ? "1" : "0"}`;
        }).join("|"),
        A = t.usage,
        l = A ? `${A.inputTokens}|${A.outputTokens}|${A.cacheCreationInputTokens ?? ""}|${A.cacheReadInputTokens ?? ""}|${A.model ?? ""}` : "no-usage";
      return `${T.id}|assistant|${h}|${i.length}|${c.length}|${s}|${l}|${t.turnElapsedMs ?? ""}`;
    }
    let r = t.content.map(h => h.type).join(",");
    return `${T.id}|info|${r}`;
  }
  let R = T.toolResult.run.status,
    a = T.toolResult.userInput,
    e = a ? `accepted:${a.accepted ? 1 : 0}|ask:${a.askAnswers ? Object.keys(a.askAnswers).length : 0}` : "none";
  return `${T.id}|tool|${R}|${T.toolUse.id}|${e}`;
}