function uqR(T, R) {
  let a = u3(T, "SKILL.md"),
    e = u3(T, "skill.md"),
    t = Ft(a) ? a : Ft(e) ? e : null;
  if (!t) return;
  let r = Z5T(t, "utf-8"),
    h = r.startsWith("\uFEFF"),
    i = r.replace(/^\uFEFF/, ""),
    c = i.match(/^(---[ \t]*)(\r?\n)([\s\S]*?)(\r?\n---[ \t]*)(\r?\n|$)/);
  if (!c?.[3]) return;
  try {
    let s = c[2] ?? `
`,
      A = wX.default.parse(c[3]);
    A.name = R;
    let l = wX.default.stringify(A).trimEnd().replace(/\n/g, s),
      o = (h ? "\uFEFF" : "") + c[1] + s + l + c[4] + c[5] + i.slice(c[0].length);
    cqR(t, o);
  } catch {
    J.debug("Failed to update skill frontmatter name", {
      path: t
    });
  }
}