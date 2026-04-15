function mWR(T) {
  if (!T) return;
  if (typeof T === "string") {
    if (T.startsWith("file://")) return zR.parse(T).fsPath;
    return l$.isAbsolute(T) ? T : void 0;
  }
  return T.fsPath;
}
function WU(T, R, a) {
  if (T.startsWith("file://")) return zR.parse(T);
  if (R && !l$.isAbsolute(T)) return zR.file(l$.resolve(R, T));
  if (!l$.isAbsolute(T)) {
    let e = mWR(a);
    if (e) return zR.file(l$.resolve(e, T));
    return;
  }
  return zR.file(T);
}