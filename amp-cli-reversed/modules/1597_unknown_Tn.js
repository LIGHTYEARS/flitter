function Tn(T, R) {
  for (let a = T.messages.length - 1; a >= 0; a--) {
    let e = T.messages[a];
    if (e?.role !== "assistant") continue;
    for (let t of e.content) if (t.type === "tool_use" && t.id === R) return t;
  }
  return;
}