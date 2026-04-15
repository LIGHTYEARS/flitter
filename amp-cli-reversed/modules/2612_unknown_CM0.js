function CM0(T) {
  let R = T.messages.at(-1);
  if (!R) return "user-message-initial";
  if (R.role === "assistant") return R.state.type === "complete" && R.state.stopReason === "end_turn" ? "user-message-reply" : !1;
  return !1;
}