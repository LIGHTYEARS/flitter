function bqR(T = u3(process.cwd(), ".agents", "skills")) {
  if (!Ft(T)) return [];
  return jaT(T, {
    withFileTypes: !0
  }).filter(R => {
    if (!R.isDirectory()) return !1;
    let a = u3(T, R.name, "SKILL.md"),
      e = u3(T, R.name, "skill.md");
    return Ft(a) || Ft(e);
  }).map(R => R.name);
}