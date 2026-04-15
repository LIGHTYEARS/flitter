function u7R(T, R) {
  if (!T) return {
    action: null
  };
  T = LWT(T);
  for (let a of T) {
    if (a.if === !1) continue;
    if (a.on.event === "tool:pre-execute") {
      if (!(Array.isArray(a.on.tool) ? a.on.tool : [a.on.tool]).includes(R.toolUse.name)) continue;
      let e = JSON.stringify(R.toolUse.input),
        t = Array.isArray(a.on["input.contains"]) ? a.on["input.contains"] : [a.on["input.contains"]];
      for (let r of t) if (e.includes(r)) {
        if (J.debug(`Hook triggered: ${a.id}`, {
          hookID: a.id,
          threadID: R.threadID,
          toolName: R.toolUse.name,
          toolUseID: R.toolUse.id,
          matchString: r,
          action: a.action
        }), a.action.type === "send-user-message") return {
          hookID: a.id,
          action: a.action
        };
      }
    }
  }
  return {
    action: null
  };
}