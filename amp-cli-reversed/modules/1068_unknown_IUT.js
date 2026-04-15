function N7(T) {
  if (!T || T.state !== "active") return !1;
  return T.interactionState === "tool-running" || T.inferenceState === "running";
}
function IUT(T, R, a) {
  if (a && !a.result) return "handoff";
  if (R === "running" || R === "cancelled") return !1;
  let e = T.messages.at(-1);
  if (!e) return "user-message-initial";
  if (e.role === "assistant") return e.state.type === "complete" && e.state.stopReason === "end_turn" ? "user-message-reply" : !1;
  if (e.content.some(t => t.type === "tool_result" && t.run.status === "blocked-on-user")) return "user-tool-approval";
  if (e.content.some(t => t.type === "tool_result" && t.run.status === "in-progress")) return "tool-running";
  return !1;
}