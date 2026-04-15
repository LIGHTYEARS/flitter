function $M0(T) {
  let R;
  for (let a of T) {
    if (a.type !== "message" || a.message.role !== "assistant") continue;
    let e = gM0(a.message);
    if (!e) continue;
    R = e;
  }
  return R;
}
function vM0(T) {
  if (typeof T === "object" && T !== null && !Array.isArray(T)) return T;
  return {};
}
function jM0(T, R, a) {
  let e = new Map();
  for (let i of T) if (i.type === "toolResult" && xM0(i.toolUse.name)) e.set(i.toolUse.id, i.toolResult.run);
  let t = (i, c) => {
      let s = e.get(i);
      if (!s || s.status !== "cancelled" || wt(c.status)) return c;
      return {
        status: "cancelled",
        reason: "Parent subagent was cancelled"
      };
    },
    r = Array.from(e.entries()),
    h = {};
  for (let [i, c] of r) {
    let s = [],
      A;
    if (c.status === "in-progress" || c.status === "done" || c.status === "error" || c.status === "cancelled") A = c.progress;
    if (Array.isArray(A)) {
      let l = 0;
      for (let o of A) if (o.tool_uses) for (let n of o.tool_uses) {
        let p = SM0(n, i, l);
        if (!n.id || n.id.length === 0) l++;
        let _ = OM0(n),
          m = n.normalized_name ?? n.tool_name,
          b = vM0(n.input),
          y = a?.get(p);
        s.push({
          toolUse: iN(m, b, p),
          toolRun: t(i, _),
          toolProgress: y
        });
      }
    }
    h[i] = {
      tools: s
    };
  }
  if (R) {
    let i = new Map();
    for (let c of R.messages) {
      let s = c.parentToolUseId;
      if (!s) continue;
      let A = i.get(s) ?? [];
      A.push(c), i.set(s, A);
    }
    for (let [c, s] of i) {
      let {
          items: A
        } = grT({
          id: R.id,
          messages: s
        }, {
          includeSubagentMessages: !0
        }),
        l = A.filter(p => p.type === "toolResult").map(p => ({
          toolUse: p.toolUse,
          toolRun: t(c, p.toolResult.run),
          toolProgress: a?.get(p.toolUse.id)
        })),
        o = $M0(A),
        n = h[c] ?? {
          tools: []
        };
      h[c] = {
        tools: l.length > 0 ? l : n.tools,
        ...(o ? {
          terminalAssistantMessage: o
        } : {})
      };
    }
  }
  return h;
}