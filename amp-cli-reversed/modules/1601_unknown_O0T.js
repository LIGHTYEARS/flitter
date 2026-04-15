function UlR(T) {
  if (!T) return !1;
  return T.role !== "assistant";
}
function HlR(T) {
  if (!T) return !1;
  if (T.role === "user") return T.content.some(R => R.type === "tool_result" && R.run.status === "rejected-by-user");
  return !1;
}
function NET(T) {
  if (!T) return !1;
  return T.role === "info";
}
function ok(T) {
  return T.role === "info" && T.content.some(R => R.type === "manual_bash_invocation");
}
function ZS(T) {
  if (T.role !== "info") return;
  return T.content.find(R => R.type === "manual_bash_invocation");
}
function WlR(T) {
  return T.replace(/u([0-9A-Fa-f]{4})(\s)/gi, (R, a, e) => {
    try {
      return String.fromCodePoint(parseInt(a, 16)) + e;
    } catch {
      return `u${a}${e}`;
    }
  });
}
function O0T(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.role === "info") {
      if (a.content.some(e => e.type === "summary" && e.summary.type === "message")) break;
    }
    if (a?.role !== "assistant" || !a.state || a.state.type !== "complete" || a.state.stopReason !== "tool_use") continue;
    for (let e of a.content) if (e.type === "tool_use" && e.name === llR && e.input) {
      let t = e.input.todos;
      if (Array.isArray(t)) return t;
      let r = e.input.content;
      if (typeof r === "string") return WlR(r);
    }
  }
  return;
}