function vD(T, R) {
  let a = T.relationships?.filter(r => r.role === "child") ?? [],
    e = GET(T),
    t = [...a, ...e];
  return R ? t.filter(r => r.type === R) : t;
}
function zET(T, R) {
  return vD(T, R)[0];
}
function _m(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.role === "user") return a;
  }
  return;
}
function FET(T) {
  for (let R = T.messages.length - 1; R >= 0; R--) {
    let a = T.messages[R];
    if (a?.role === "user" && a.agentMode) return a.agentMode;
  }
  return;
}
function GET(T) {
  let R = [],
    a = new Set();
  if (!T.messages) return R;
  return T.messages.forEach((e, t) => {
    if (e.role !== "assistant") return;
    e.content.forEach(r => {
      if (r.type !== "tool_use") return;
      if (r.name !== Ij) return;
      if (!Va(r)) return;
      let h = r.input,
        i = typeof h.threadID === "string" ? mr(h.threadID) : null;
      if (i && !a.has(i)) a.add(i), R.push({
        threadID: i,
        type: "mention",
        role: "parent",
        messageIndex: t,
        createdAt: Date.now()
      });
    });
  }), R;
}