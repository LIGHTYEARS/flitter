function d7R(T) {
  let R = Object.entries(T.properties ?? {});
  if (R.length === 0) return ["{}"];
  let a = new Set(T.required ?? []),
    e = ["{"];
  for (let [t, r] of R) {
    if (r.description) for (let A of r.description.split(`
`).filter(Boolean)) e.push(`	// ${A}`);
    let h = a.has(t) ? "" : "?",
      i = E7R(t),
      c = Tb(r),
      s = `	${i}${h}: ${c[0]}`;
    if (r.default !== void 0) s += ` // default: ${L7R(r.default)}`;
    e.push(s);
    for (let A = 1; A < c.length; A += 1) e.push(`	${c[A]}`);
  }
  return e.push("}"), e;
}