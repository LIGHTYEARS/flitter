function LqR() {
  return xt(DX.homedir(), ".config", "agents", "skills");
}
function BqR(T, R, a) {
  return Promise.race([T, new Promise((e, t) => setTimeout(() => t(Error(`${a} timed out after ${R}ms`)), R))]);
}
function NqR(T, R) {
  let a = new Map(R.skills.map(r => [r.baseDir, r])),
    e = new Set(R.errors.map(r => {
      let h = r.path;
      if (h.endsWith("/SKILL.md")) return h.slice(0, -9);
      return h;
    })),
    t = [...R.skills];
  for (let r of T.skills) {
    let h = a.has(r.baseDir),
      i = e.has(r.baseDir);
    if (!h && !i) t.push(r), J.debug("Retaining cached skill not found in fresh scan", {
      name: r.name,
      baseDir: r.baseDir
    });
  }
  return t.sort((r, h) => r.name.localeCompare(h.name)), {
    skills: t,
    errors: R.errors,
    warnings: R.warnings
  };
}