function YgT(T) {
  return (T.normalizedName ?? T.name) === Dt;
}
function J50(T, R, a) {
  let e = $R.maybeOf(T)?.colors ?? Z0.of(T).colorScheme,
    t = R.trimStart().startsWith("You're absolutely right"),
    r = new k3(`${a}-text`),
    h = [];
  if (t) h.push(new l8R({
    key: r,
    markdown: R,
    defaultColor: e.foreground
  }));else h.push(new Z3({
    key: r,
    markdown: R
  }));
  if (h.length === 1) return h[0];
  return new xR({
    crossAxisAlignment: "stretch",
    mainAxisSize: "min",
    children: h
  });
}