function Az0(T, R) {
  let a = new Map();
  for (let e of T) {
    let t = lz0(e.baseDir, R),
      r = t.scope === "local" ? "Local" : t.scope === "global" ? "Global" : "Built-in",
      h = `${t.scope}:${t.pathHint ?? ""}`,
      i = a.get(h);
    if (i) {
      i.skills.push(e);
      continue;
    }
    a.set(h, {
      scope: t.scope,
      label: r,
      pathHint: t.pathHint,
      skills: [e]
    });
  }
  return [...a.values()].sort((e, t) => {
    let r = {
        local: 0,
        global: 1,
        builtin: 2
      },
      h = r[e.scope] - r[t.scope];
    if (h !== 0) return h;
    return (e.pathHint ?? "").localeCompare(t.pathHint ?? "");
  });
}