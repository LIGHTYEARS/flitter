function rm0(T, R) {
  let a = gs(T, "package"),
    e = gs(a, "dist", "main.js"),
    t = gs(a, "package.json");
  if (!Sl(e) || !Sl(t)) return !0;
  try {
    return JSON.parse(HVT(t, "utf8")).version !== R;
  } catch {
    return !0;
  }
}