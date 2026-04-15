function MN0(T, R) {
  if (R === ex) return T.app.shellModeHidden;
  return T.app.shellMode;
}
function YP(T) {
  if (T.startsWith("$$")) return {
    cmd: T.slice(2).trim(),
    visibility: ex
  };
  if (T.startsWith("$")) return {
    cmd: T.slice(1).trim(),
    visibility: VrT
  };
  return null;
}