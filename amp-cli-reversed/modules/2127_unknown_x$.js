function H4(T, R, a) {
  return Math.min(Math.max(T, R), a);
}
function x$(T) {
  if (T instanceof xT) return q8(T.text.toPlainText());
  if (T instanceof XT) return Math.max(0, T.width ?? 0);
  if (T instanceof T0) return T.children.reduce((R, a) => R + x$(a), 0);
  if (T instanceof Ta) {
    let R = 0;
    for (let a of T.children) R = Math.max(R, x$(a));
    return R;
  }
  if (T instanceof Fm || T instanceof j0 || T instanceof wtT || T instanceof ca) return x$(T.child);
  if (T instanceof SR || T instanceof dH || T instanceof G0) {
    if (T.child) return x$(T.child);
    return 0;
  }
  return 1;
}