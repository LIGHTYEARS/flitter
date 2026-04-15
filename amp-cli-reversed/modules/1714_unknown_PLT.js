function yLT(T) {
  return T.flatMap(R => {
    let a = IbR(R);
    return a ? [R, a] : [R];
  });
}
async function PLT(T, R, a, e = "thread", t, r) {
  let h = await m0(fbR(a));
  try {
    let i = yLT(h),
      c = await CD(T, R, i, e, LD, t, "user", r);
    if (!c.matchedEntry) c = await CD(T, R, PN, e, void 0, t, "built-in", r);
    if (!c.matchedEntry) return {
      permitted: !1,
      action: null,
      reason: "No matching entry found, denying by default"
    };
    let s = c.matchedEntry?.action === "delegate" && c.action !== "reject" && c.action !== "ask" ? "delegate" : c.action;
    switch (c.action) {
      case "allow":
        return {
          permitted: !0,
          action: s,
          matchedEntry: c.matchedEntry,
          error: c.error,
          source: c.source
        };
      case "reject":
        return {
          permitted: !1,
          action: s,
          matchedEntry: c.matchedEntry,
          reason: `Rejected by ${c.source === "built-in" ? "built-in" : c.source || "unknown"} permissions rule ${c.matchIndex}: ${Z2(c.matchedEntry)}`,
          error: c.error,
          source: c.source
        };
      case "ask":
        return {
          permitted: !1,
          action: s,
          matchedEntry: c.matchedEntry,
          reason: `Matches ${c.source === "built-in" ? "built-in" : c.source || "unknown"} permissions rule ${c.matchIndex}: ${Z2(c.matchedEntry)}`,
          error: c.error,
          source: c.source
        };
      case null:
        if (c.error) return {
          permitted: !1,
          action: null,
          reason: c.error,
          error: c.error
        };
        return {
          permitted: !0,
          action: null
        };
      default:
        return {
          permitted: !1,
          action: null,
          reason: "Unknown permission result"
        };
    }
  } catch (i) {
    return {
      permitted: !1,
      action: null,
      reason: i instanceof Error ? i.message : "Permission evaluation failed",
      error: i instanceof Error ? i.message : "Permission evaluation failed"
    };
  }
}