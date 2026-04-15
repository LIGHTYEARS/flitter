function _IR(T) {
  if (T.messages.length === 0) return T;
  return Lt(T, R => {
    let a = !0;
    while (a && R.messages.length > 0) {
      a = !1;
      let e = R.messages.length - 1,
        t = R.messages[e];
      if (t?.role === "assistant") {
        let r = t.state;
        if (r.type === "complete" && r.stopReason === "tool_use") {
          let h = new Set();
          for (let i of t.content) if (i.type === "tool_use") h.add(i.id);
          if (h.size > 0) J.debug("Removing trailing assistant message with tool_use stop", {
            toolUseCount: h.size
          }), R.messages.pop(), a = !0;
        }
        continue;
      }
      if (t?.role === "user" && e >= 1) {
        let r = R.messages[e - 1];
        if (r?.role === "assistant") {
          let h = r.state;
          if (h.type === "complete" && h.stopReason === "tool_use") {
            let i = new Set();
            for (let s of r.content) if (s.type === "tool_use") i.add(s.id);
            let c = new Set();
            for (let s of t.content) if (s.type === "tool_result" && wt(s.run.status)) c.add(s.toolUseID);
            if (!(i.size > 0 && [...i].every(s => c.has(s)))) J.debug("Removing incomplete tool use sequence from thread for handoff", {
              expectedCount: i.size,
              actualCount: c.size
            }), R.messages.pop(), R.messages.pop(), a = !0;
          }
        }
      }
    }
  });
}