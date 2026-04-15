function BET(T, R = "Untitled") {
  if (T?.title) return _ET(T.title, 300);
  return R;
}
function NlR(T) {
  if (!T) return !1;
  if (T.role === "assistant") return T.state?.type === "cancelled";
  if (T.role === "user") return T.content.some(R => R.type === "tool_result" && R.run.status === "cancelled");
  return !1;
}