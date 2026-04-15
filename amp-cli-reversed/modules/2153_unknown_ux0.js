function afT(T, R) {
  return R === void 0 ? `tool:${T}` : `tool:${T}:${R}`;
}
function px0(T, R) {
  return `manual-bash:${T}:${R}`;
}
function bx0(T) {
  return _x0.has(T);
}
function W4(T) {
  return T === "done";
}
function mx0(T, R = {}) {
  let a = ux0(T);
  return yx0(a, R);
}
function ux0(T) {
  let R = [],
    a = new Map();
  for (let [e, t] of T.entries()) if (t.role === "assistant") {
    let r = t.state?.type === "streaming" || t.state?.type === "complete" && t.state.stopReason === null,
      h = t.content.filter(i => i.type === "text" && !i.hidden && (i.text ?? "").trim() !== "");
    if (h.length > 0) R.push({
      type: "message",
      timestampLookupID: t.messageId,
      message: {
        role: "assistant",
        content: h,
        images: []
      }
    });
    for (let i of t.content) if (i.type === "tool_use") {
      let c = R.push({
        type: "toolResult",
        timestampLookupID: t.messageId,
        toolUse: i
      }) - 1;
      a.set(i.id, {
        itemIndex: c,
        messageIndex: e,
        isStreaming: r
      });
    }
  } else if (t.role === "user") {
    for (let s of t.content) if (s.type === "tool_result") {
      let A = a.get(s.toolUseID);
      if (A) {
        let l = R[A.itemIndex];
        if (l?.type === "toolResult") l.toolResult = s;
        a.delete(s.toolUseID);
      }
    }
    let r = t.content.filter(s => s.type === "text" && !s.hidden && (s.text ?? "").trim() !== ""),
      h = t.content.filter(s => s.type === "image"),
      i = t.meta?.fromAggman === !0,
      c = t.meta?.fromExecutorThreadID;
    if (r.length > 0 || h.length > 0) R.push({
      type: "message",
      timestampLookupID: t.messageId,
      message: {
        role: "user",
        content: r,
        images: h,
        ...(i ? {
          fromAggman: !0
        } : {}),
        ...(c ? {
          fromExecutorThreadID: c
        } : {})
      }
    });
  } else if (t.role === "info") {
    for (let [r, h] of t.content.entries()) if (h.type === "manual_bash_invocation") R.push({
      type: "manualBashInvocation",
      rowID: px0(t.messageId, r),
      manualBashInvocation: h
    });
  }
  for (let [e, t] of a) {
    let r = R[t.itemIndex];
    if (r?.type !== "toolResult") continue;
    let h = T.slice(t.messageIndex + 1).some(c => {
        if (c.role === "assistant") return !0;
        return c.content.some(s => s.type !== "tool_result");
      }) ? "cancelled" : t.isStreaming ? "in-progress" : "queued",
      i = {
        type: "tool_result",
        toolUseID: e,
        run: {
          status: h
        }
      };
    r.toolResult = i;
  }
  return R;
}