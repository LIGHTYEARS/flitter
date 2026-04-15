function qx0(T, R) {
  let a = [],
    e = new Set(),
    t = A => {
      let l = `${A.kind}:${A.title}`;
      if (e.has(l)) return;
      e.add(l), a.push(A);
    },
    {
      main: r,
      checks: h
    } = Wx0(T);
  if (T.status === "queued") t({
    kind: "thinking",
    title: "Code review queued"
  });
  if (T.status === "error") {
    let A = aa(T) ?? "Unknown error";
    t({
      kind: "explore",
      title: `Code review failed: ${A}`
    });
  }
  if (r?.status === "in-progress" || r?.status === "done") {
    if (Array.isArray(r.toolUses)) for (let A of r.toolUses) {
      let l = Vw(A);
      if (l) t(l);
    }
  }
  for (let A of FtT(T)) {
    let l = Vw(A);
    if (l) t(l);
  }
  let i = 0,
    c = 0;
  for (let [A, l] of Object.entries(h ?? {})) {
    if (!ye(l)) continue;
    c += 1;
    let o = wx0(A, l);
    if (l.status === "done") {
      i += 1;
      let n = Bx0(l);
      if (n === void 0) t({
        kind: "explore",
        title: `Check ${o}: complete`
      });else if (n === 0) t({
        kind: "explore",
        title: `Check ${o}: ok`
      });else t({
        kind: "explore",
        title: `Check ${o}: ${n} ${o9(n, "issue")} found`
      });
      continue;
    }
    if (l.status === "error") {
      i += 1;
      let n = typeof l.error === "string" && l.error.trim() ? l.error.trim() : "Unknown error";
      t({
        kind: "explore",
        title: `Check ${o}: error (${n})`
      });
      continue;
    }
    if (l.status === "in-progress") {
      let n = typeof l.message === "string" && l.message.trim() ? l.message.trim() : "Running check...";
      t({
        kind: "explore",
        title: `Check ${o}: ${n}`
      });
    }
  }
  if (r?.status === "done" && c > 0 && i < c) t({
    kind: "thinking",
    title: "Main review complete, running checks..."
  });
  if (T.status === "done") t({
    kind: "explore",
    title: "Code review complete"
  });
  if (a.length === 0) t({
    kind: "thinking",
    title: T.status === "queued" ? "Code review queued" : "Reviewing code changes..."
  });
  let s = R.thoroughness === "quick" ? "quick code review" : "code review";
  return {
    actions: a,
    summary: c > 0 ? `${i}/${c} checks \xB7 ${s}` : s
  };
}