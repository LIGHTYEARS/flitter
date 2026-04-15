function dl0(T) {
  return {
    type: "thinking",
    thinking: T.thinking
  };
}
function El0(T) {
  return {
    type: "redacted_thinking",
    data: T.data
  };
}
function Cl0(T, R, a, e) {
  let t = [],
    r = e?.includeThinking ?? !1;
  for (let h of T.content) if (h.type === "text") t.push(UKT(h));else if (h.type === "tool_use") t.push(Sl0(h));else if (r && h.type === "thinking") t.push(dl0(h));else if (r && h.type === "redacted_thinking") t.push(El0(h));
  return {
    type: "assistant",
    message: {
      type: "message",
      role: "assistant",
      content: t,
      stop_reason: T.state.type === "complete" ? T.state.stopReason : null,
      usage: T.usage ? Ml0(T.usage) : void 0
    },
    parent_tool_use_id: a ?? null,
    session_id: R
  };
}