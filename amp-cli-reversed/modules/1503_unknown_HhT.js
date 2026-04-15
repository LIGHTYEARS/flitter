function HhT(T, R, a, e) {
  for (let r of T) if (r.issues.length === 0) return R.value = r.value, R;
  let t = T.filter(r => !z_(r));
  if (t.length === 1) return R.value = t[0].value, t[0];
  return R.issues.push({
    code: "invalid_union",
    input: R.value,
    inst: a,
    errors: T.map(r => r.issues.map(h => bi(h, e, st())))
  }), R;
}