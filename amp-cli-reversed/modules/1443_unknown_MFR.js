function MFR(T, R, a) {
  let e = [],
    t = i3(R, "checkResult");
  if (!t) return {
    check: T,
    result: {
      name: T.name,
      status: "error",
      issuesFound: 0,
      errorMessage: "No checkResult block found in agent output"
    },
    issues: []
  };
  let r = t.match(/<status>(.*?)<\/status>/)?.[1] === "completed" ? "completed" : "error",
    h = t.match(/<filesAnalyzed>(\d+)<\/filesAnalyzed>/),
    i = t.match(/<linesAnalyzed>(\d+)<\/linesAnalyzed>/),
    c = h?.[1],
    s = i?.[1],
    A = c ? parseInt(c, 10) : void 0,
    l = s ? parseInt(s, 10) : void 0,
    o = [],
    n = i3(t, "patternsChecked");
  if (n) {
    let _ = n.matchAll(/<pattern>([\s\S]*?)<\/pattern>/g);
    for (let m of _) {
      let b = m[1]?.trim();
      if (b) o.push(b);
    }
  }
  let p = i3(t, "issues");
  if (p) {
    let _ = p.matchAll(/<issue\s+([^>]+)>([\s\S]*?)<\/issue>/g);
    for (let m of _) {
      let b = m[1] ?? "",
        y = m[2] ?? "",
        u = b.match(/severity="(critical|high|medium|low)"/),
        P = b.match(/file="([^"]+)"/),
        k = b.match(/line="(\d+)"/),
        x = u?.[1],
        f = P?.[1],
        v = k?.[1],
        g = i3(y, "problem"),
        I = i3(y, "why"),
        S = i3(y, "fix"),
        O = g?.trim() || y.trim();
      if (x && f && O) {
        let j = zU.isAbsolute(f) ? f : zU.join(a, f);
        e.push({
          check: T.name,
          severity: x,
          file: j,
          line: v ? parseInt(v, 10) : void 0,
          problem: O,
          why: I?.trim(),
          fix: S?.trim(),
          source: T.name
        });
      }
    }
  }
  return {
    check: T,
    result: {
      name: T.name,
      status: r,
      filesAnalyzed: A,
      linesAnalyzed: l,
      patternsChecked: o.length > 0 ? o : void 0,
      issuesFound: e.length
    },
    issues: e
  };
}