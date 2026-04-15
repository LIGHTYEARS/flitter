function DW(T, R, a) {
  return R && a === "file" ? T.replaceAll("/", "\\") : T;
}
function AET(T) {
  let R = gD;
  return gD = T, R;
}
function VnR() {
  if (gD) return gD;
  throw Error("must call setDisplayPathEnvInfo before calling displayPath() and related functions");
}
function miT() {
  if (Lg > w$.length - 16) XnR(w$), Lg = 0;
  return w$.slice(Lg, Lg += 16);
}
function QnR(T, R = 0) {
  return (ce[T[R + 0]] + ce[T[R + 1]] + ce[T[R + 2]] + ce[T[R + 3]] + "-" + ce[T[R + 4]] + ce[T[R + 5]] + "-" + ce[T[R + 6]] + ce[T[R + 7]] + "-" + ce[T[R + 8]] + ce[T[R + 9]] + "-" + ce[T[R + 10]] + ce[T[R + 11]] + ce[T[R + 12]] + ce[T[R + 13]] + ce[T[R + 14]] + ce[T[R + 15]]).toLowerCase();
}