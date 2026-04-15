function h50(T, R) {
  return T.edges.filter(a => a.from.name === R.name);
}
function t2(T, R) {
  return h50(T, R).map(a => a.to);
}
function i50(T) {
  let R = {
      actors: [],
      messages: [],
      blocks: [],
      notes: []
    },
    a = new Set(),
    e = [];
  for (let t = 1; t < T.length; t++) {
    let r = T[t],
      h = r.match(/^(participant|actor)\s+(\S+?)(?:\s+as\s+(.+))?$/);
    if (h) {
      let o = h[1],
        n = h[2],
        p = h[3]?.trim() ?? n;
      if (!a.has(n)) a.add(n), R.actors.push({
        id: n,
        label: p,
        type: o
      });
      continue;
    }
    let i = r.match(/^Note\s+(left of|right of|over)\s+([^:]+):\s*(.+)$/i);
    if (i) {
      let o = i[1].toLowerCase(),
        n = i[2].trim(),
        p = i[3].trim(),
        _ = n.split(",").map(b => b.trim());
      for (let b of _) dg(R, a, b);
      let m = "over";
      if (o === "left of") m = "left";else if (o === "right of") m = "right";
      R.notes.push({
        actorIds: _,
        text: p,
        position: m,
        afterIndex: R.messages.length - 1
      });
      continue;
    }
    let c = r.match(/^(loop|alt|opt|par|critical|break|rect)\s*(.*)$/);
    if (c) {
      let o = c[1],
        n = c[2]?.trim() ?? "";
      e.push({
        type: o,
        label: n,
        startIndex: R.messages.length,
        dividers: []
      });
      continue;
    }
    let s = r.match(/^(else|and)\s*(.*)$/);
    if (s && e.length > 0) {
      let o = s[2]?.trim() ?? "";
      e[e.length - 1].dividers.push({
        index: R.messages.length,
        label: o
      });
      continue;
    }
    if (r === "end" && e.length > 0) {
      let o = e.pop();
      R.blocks.push({
        type: o.type,
        label: o.label,
        startIndex: o.startIndex,
        endIndex: Math.max(R.messages.length - 1, o.startIndex),
        dividers: o.dividers
      });
      continue;
    }
    let A = r.match(/^(\S+?)\s*(--?>?>|--?[)x]|--?>>|--?>)\s*([+-]?)(\S+?)\s*:\s*(.+)$/);
    if (A) {
      let o = A[1],
        n = A[2],
        p = A[3],
        _ = A[4],
        m = A[5].trim();
      dg(R, a, o), dg(R, a, _);
      let b = n.startsWith("--") ? "dashed" : "solid",
        y = n.includes(">>") || n.includes("x") ? "filled" : "open",
        u = {
          from: o,
          to: _,
          label: m,
          lineStyle: b,
          arrowHead: y
        };
      if (p === "+") u.activate = !0;
      if (p === "-") u.deactivate = !0;
      R.messages.push(u);
      continue;
    }
    let l = r.match(/^(\S+?)\s*(->>|-->>|-\)|--\)|-x|--x|->|-->)\s*([+-]?)(\S+?)\s*:\s*(.+)$/);
    if (l) {
      let o = l[1],
        n = l[2],
        p = l[3],
        _ = l[4],
        m = l[5].trim();
      dg(R, a, o), dg(R, a, _);
      let b = n.startsWith("--") ? "dashed" : "solid",
        y = n.includes(">>") || n.includes("x") ? "filled" : "open",
        u = {
          from: o,
          to: _,
          label: m,
          lineStyle: b,
          arrowHead: y
        };
      if (p === "+") u.activate = !0;
      if (p === "-") u.deactivate = !0;
      R.messages.push(u);
      continue;
    }
  }
  return R;
}