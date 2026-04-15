function $h(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.parentToolUseId) continue;
    if (a?.role === "info") {
      let e = a.content[0];
      if (e?.type === "summary" && e?.summary.type === "message") return;
    }
    if (a?.role === "assistant" && a.usage) {
      if (a.usage.totalInputTokens === 0) continue;
      return a.usage;
    }
  }
  return;
}