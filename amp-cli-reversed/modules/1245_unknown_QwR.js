function QwR(T, R, a = !1) {
  let e = dt(T, "assistant");
  if (!e || e.state.type !== "complete" || e.state.stopReason !== "tool_use") return !1;
  let t = e.content.filter(h => h.type === "tool_use").map(h => h.id);
  if (R && !t.includes(R)) return J.debug(`tool:data for orphaned tool_use ${R} - ignoring for inference`, {
    name: "shouldRunInferenceWithToolData",
    threadID: T.id
  }), !1;
  if (t.length === 0) return !1;
  let r = sA(T);
  if (!t.every(h => {
    let i = r.get(h);
    if (!i?.run || !wt(i.run.status)) return !1;
    let c = i.run.status;
    if (c === "cancelled") {
      let s = i.run.reason;
      return s ? !s.startsWith("user:") : !1;
    }
    if (c === "rejected-by-user") return a;
    return !0;
  })) return !1;
  if (t.every(h => {
    let i = r.get(h);
    if (!i || i.run.status !== "done") return !1;
    return i.run.isFinal === !0;
  })) return !1;
  return !0;
}