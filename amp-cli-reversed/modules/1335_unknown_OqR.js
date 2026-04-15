function OqR(T) {
  let R = hw(T, "SKILL.md"),
    a = hw(T, "skill.md"),
    e;
  if (yuT(R)) e = R;else if (yuT(a)) e = a;else throw new Ac(`No SKILL.md found in ${T}`);
  let t = RzT(e, "utf-8"),
    {
      frontmatter: r,
      body: h
    } = SqR(t),
    i = SaT(T);
  jqR(i);
  let c = i.reduce((s, A) => s + A.size, 0);
  return {
    name: r.name,
    description: r.description,
    frontmatter: r,
    readme: h,
    files: i.map(s => ({
      path: s.path,
      size: s.size
    })),
    totalSizeBytes: c
  };
}