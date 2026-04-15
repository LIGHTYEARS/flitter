function StT(T) {
  return jXT(T, "ENOENT");
}
function qxT(T) {
  return jXT(T, "EISDIR");
}
function jXT(T, R) {
  return T instanceof Error && "code" in T && T.code === R;
}
function gP0(T) {
  let R = [];
  if (T.syncedPaths.length > 0) R.push(`updated ${zxT(T.syncedPaths, "filename")}`);
  if (T.removedPaths.length > 0) R.push(`removed ${zxT(T.removedPaths, "filename")}`);
  return R.length > 0 ? R.join(", ") : null;
}