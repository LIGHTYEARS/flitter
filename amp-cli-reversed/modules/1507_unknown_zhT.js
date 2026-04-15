function nE(T, R, a) {
  if (T.issues.length) R.issues.push(...cc(a, T.issues));
  R.value[a] = T.value;
}
function zhT(T, R, a, e, t, r, h) {
  if (T.issues.length) if (Gv.has(typeof e)) a.issues.push(...cc(e, T.issues));else a.issues.push({
    code: "invalid_key",
    origin: "map",
    input: t,
    inst: r,
    issues: T.issues.map(i => bi(i, h, st()))
  });
  if (R.issues.length) if (Gv.has(typeof e)) a.issues.push(...cc(e, R.issues));else a.issues.push({
    origin: "map",
    code: "invalid_element",
    input: t,
    inst: r,
    key: e,
    issues: R.issues.map(i => bi(i, h, st()))
  });
  a.value.set(T.value, R.value);
}