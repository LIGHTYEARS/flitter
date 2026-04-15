function fAR(T) {
  if (T.folder) return BiT(T.folder);
  let R = T.workspaceIdentifier?.configURIPath;
  if (!R) return null;
  let a = BiT(R);
  return a ? Ai.dirname(a) : null;
}
function BiT(T) {
  try {
    return zR.parse(T).fsPath;
  } catch {
    if (Ai.isAbsolute(T)) return T;
    return null;
  }
}
async function IAR(T) {
  try {
    let R = await lk.promises.readFile(T, "utf-8"),
      a = JSON.parse(R);
    if (a.folder) return zR.parse(a.folder).fsPath;
    if (a.configuration) return Ai.dirname(zR.parse(a.configuration).fsPath);
  } catch (R) {
    J.debug("Failed to parse VS Code workspace metadata", {
      workspaceMetadataPath: T,
      error: R instanceof Error ? R.message : String(R)
    });
  }
  return null;
}