function WhT(T, R, a, e) {
  let t = T.filter(r => r.issues.length === 0);
  if (t.length === 1) return R.value = t[0].value, R;
  if (t.length === 0) R.issues.push({
    code: "invalid_union",
    input: R.value,
    inst: a,
    errors: T.map(r => r.issues.map(h => bi(h, e, st())))
  });else R.issues.push({
    code: "invalid_union",
    input: R.value,
    inst: a,
    errors: [],
    inclusive: !1
  });
  return R;
}