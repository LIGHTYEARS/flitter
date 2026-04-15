function EM0(T) {
  let R = T.messages.filter(h => !h.parentToolUseId),
    a = -1;
  for (let h = R.length - 1; h >= 0; h--) if (R[h]?.role === "assistant") {
    a = h;
    break;
  }
  if (a < 0) return {
    running: 0,
    blocked: 0
  };
  let e = R[a];
  if (!e) return {
    running: 0,
    blocked: 0
  };
  let t = new Map();
  for (let h of R.slice(a + 1)) {
    if (h.role !== "user") continue;
    for (let i of h.content) if (i.type === "tool_result") t.set(i.toolUseID, i.run);
  }
  let r = 0;
  for (let h of e.content) {
    if (h.type !== "tool_use") continue;
    let i = t.get(h.id);
    if (!i || !wt(i.status)) r++;
  }
  return {
    running: r,
    blocked: 0
  };
}