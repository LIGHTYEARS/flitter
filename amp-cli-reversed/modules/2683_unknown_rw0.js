function tw0(T, R) {
  let a = /\d/;
  if (T[R] === "x") R++, a = /[\da-fA-F]/;
  for (; R < T.length; R++) {
    if (T[R] === ";") return R;
    if (!T[R].match(a)) break;
  }
  return -1;
}
function rw0(T, R) {
  if (R++, T[R] === ";") return -1;
  if (T[R] === "#") return R++, tw0(T, R);
  let a = 0;
  for (; R < T.length; R++, a++) {
    if (T[R].match(/\w/) && a < 20) continue;
    if (T[R] === ";") break;
    return -1;
  }
  return R;
}