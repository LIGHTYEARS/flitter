function yqR(T = u3(process.cwd(), ".agents", "skills")) {
  if (!Ft(T)) return [];
  let R = jaT(T, {
      withFileTypes: !0
    }),
    a = [];
  for (let e of R) {
    if (!e.isDirectory()) continue;
    let t = u3(T, e.name, "SKILL.md"),
      r = u3(T, e.name, "skill.md"),
      h = Ft(t) ? t : Ft(r) ? r : null;
    if (!h) continue;
    try {
      let i = Z5T(h, "utf-8"),
        c = mqR(i);
      if (c?.frontmatter) a.push({
        name: c.frontmatter.name || e.name,
        description: c.frontmatter.description || "",
        frontmatter: c.frontmatter,
        path: u3(T, e.name)
      });
    } catch {
      J.debug("Failed to parse skill frontmatter", {
        path: h
      });
    }
  }
  return a;
}