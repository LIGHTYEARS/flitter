function pk0(T, R, a) {
  if (T.role !== "assistant") return null;
  let e = a && a.role === "assistant" ? [...a.content] : [];
  for (let t of T.blocks ?? []) {
    let r = e[e.length - 1];
    if (t.type === "text" && r?.type === "text") e[e.length - 1] = {
      ...r,
      text: r.text + t.text
    };else if (t.type === "thinking" && r?.type === "thinking") e[e.length - 1] = {
      ...r,
      thinking: r.thinking + t.thinking
    };else e.push(t);
  }
  return {
    role: "assistant",
    content: e,
    messageId: R,
    dtwMessageID: T.messageId,
    state: {
      type: "streaming"
    }
  };
}