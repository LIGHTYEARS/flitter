function BhT(T, R, a) {
  if (T.issues.length) R.issues.push(...cc(a, T.issues));
  R.value[a] = T.value;
}
function sD(T, R, a, e, t) {
  if (T.issues.length) {
    if (t && !(a in e)) return;
    R.issues.push(...cc(a, T.issues));
  }
  if (T.value === void 0) {
    if (a in e) R.value[a] = void 0;
  } else R.value[a] = T.value;
}