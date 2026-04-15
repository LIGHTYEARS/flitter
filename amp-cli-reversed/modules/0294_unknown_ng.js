function Wl0(T) {
  return T !== void 0;
}
function ql0(T) {
  for (let R of T) if (R.type === "tool_result" && !wt(R.run.status)) return !1;
  return !0;
}
function HKT(T) {
  return T.parentToolUseId === void 0;
}
function WKT(T) {
  return T.role === "assistant" && HKT(T);
}
function IkT(T) {
  return T.filter(R => WKT(R) && R.state.type !== "streaming").length;
}
function gkT(T) {
  return T.messages.findLast(WKT);
}
function zl0(T) {
  return T.dtwMessageID ?? (T.messageId !== void 0 ? `${T.role}:${T.parentToolUseId ?? "top-level"}:${T.messageId}` : void 0);
}
async function ng(T) {
  let R = JSON.stringify(T) + `
`;
  try {
    if (!process.stdout.write(R)) await $l0(process.stdout, "drain");
  } catch (a) {
    throw J.error("Failed to emit JSON message", {
      error: a,
      messageType: T.type
    }), a;
  }
}