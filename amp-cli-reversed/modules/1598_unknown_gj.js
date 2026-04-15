function gj(T, R) {
  for (let [a, e] of T.messages.entries()) {
    if (e.role !== "assistant") continue;
    for (let [t, r] of e.content.entries()) if (r.type === "tool_use" && r.id === R) return {
      message: e,
      messageIndex: a,
      block: r,
      blockIndex: t
    };
  }
  return null;
}