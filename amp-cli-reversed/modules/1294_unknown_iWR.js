function hWR(T) {
  if (!Pj(T)) throw Error(`Expected a file URI (got ${T.toString()})`);
}
function wo(T) {
  return T !== null && typeof T === "object" && "code" in T && T.code === "ENOENT";
}
async function iWR(T) {
  if (T.scheme !== "file") throw Error("nodeRealpath only supports file URIs");
  try {
    return zR.file(await ch.promises.realpath(T.fsPath));
  } catch (R) {
    if (wo(R)) throw new ur(T);
    throw R;
  }
}