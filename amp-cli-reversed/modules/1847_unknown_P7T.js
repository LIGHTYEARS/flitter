function WkR(T) {
  return Y9T(T);
}
async function P7T(T, R, a, e) {
  let t = [],
    r = [],
    h = [],
    i = new Set(),
    c = new Map(),
    s = typeof process < "u" ? NkR.homedir() : null,
    A = new Set();
  for (let b of R) {
    let y = Ht(b);
    A.add(d0(y));
    while (y) {
      if (Q9T(y)) break;
      A.add(d0(y));
      let u = MR.dirname(y);
      if (MR.equalURIs(u, y)) break;
      y = u;
    }
  }
  if (J.info("Scanning for skills", {
    searchRoots: [...A],
    workspaceRoots: R
  }), s) {
    let b = MR.joinPath(zR.file(s), ".config", "agents", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global agent skill");
  }
  if (s) {
    let b = MR.joinPath(zR.file(s), ".config", "amp", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global amp skill");
  }
  for (let b of A) {
    let y = Ht(b),
      u = MR.joinPath(y, ".agents", "skills");
    await Eu(T, u, i, c, t, r, h, a, "local .agents skill");
  }
  if (!e?.["skills.disableClaudeCodeSkills"]) for (let b of A) {
    let y = Ht(b),
      u = MR.joinPath(y, ".claude", "skills");
    await Eu(T, u, i, c, t, r, h, a, "local .claude skill");
  }
  if (!e?.["skills.disableClaudeCodeSkills"] && s) {
    let b = MR.joinPath(zR.file(s), ".claude", "skills");
    await Eu(T, b, i, c, t, r, h, a, "global .claude skill");
  }
  if (!e?.["skills.disableClaudeCodeSkills"] && s) {
    let b = MR.joinPath(zR.file(s), ".claude", "plugins", "cache");
    await Eu(T, b, i, c, t, r, h, a, "plugin skill");
  }
  let l = typeof process < "u" && process.env.AMP_TOOLBOX ? process.env.AMP_TOOLBOX : void 0,
    o = s ? `${s}/.config/amp/tools` : null,
    n = l ? Y9T(l) : o ? [o] : [],
    p = await Promise.all(n.map(b => $lT(T, zR.file(b), a, "toolbox skill")));
  for (let b of p) vlT(b, i, c, t, r, h);
  let _ = WkR(e?.["skills.path"]),
    m = await Promise.all(_.map(b => $lT(T, zR.file(b), a, "custom skills.path skill")));
  for (let b of m) vlT(b, i, c, t, r, h);
  for (let b of DkR(e)) {
    let y = c.get(b.name);
    if (y) h.push({
      path: b.baseDir,
      error: `Skill "${b.name}" is masked by ${Mr(y)}`
    });else c.set(b.name, b.baseDir), t.push(b);
  }
  return J.info("Finished loading skills", {
    totalSkills: t.length,
    skillNames: t.map(b => b.name),
    skillBaseDirs: t.map(b => b.baseDir),
    errorCount: r.length,
    warningCount: h.length
  }), {
    skills: t,
    errors: r,
    warnings: h
  };
}