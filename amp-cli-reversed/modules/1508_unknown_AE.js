function FhT(T, R) {
  if (T.issues.length) R.issues.push(...T.issues);
  R.value.add(T.value);
}
function GhT(T, R) {
  if (T.issues.length && R === void 0) return {
    issues: [],
    value: void 0
  };
  return T;
}
function KhT(T, R) {
  if (T.value === void 0) T.value = R.defaultValue;
  return T;
}
function VhT(T, R) {
  if (!T.issues.length && T.value === void 0) T.issues.push({
    code: "invalid_type",
    expected: "nonoptional",
    input: T.value,
    inst: R
  });
  return T;
}
function lE(T, R, a) {
  if (T.issues.length) return T.aborted = !0, T;
  return R._zod.run({
    value: T.value,
    issues: T.issues
  }, a);
}
function AE(T, R, a) {
  if (T.issues.length) return T.aborted = !0, T;
  if ((a.direction || "forward") === "forward") {
    let e = R.transform(T.value, T);
    if (e instanceof Promise) return e.then(t => pE(T, t, R.out, a));
    return pE(T, e, R.out, a);
  } else {
    let e = R.reverseTransform(T.value, T);
    if (e instanceof Promise) return e.then(t => pE(T, t, R.in, a));
    return pE(T, e, R.in, a);
  }
}