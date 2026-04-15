async function NAR(T) {
  let R = T.workspaceId;
  if (!R) return null;
  if (!T.pid || !aO(T.pid)) return null;
  let a = await VAR(T.pid);
  if (!a || !(await jCT())) return null;
  try {
    let e = await GAR(a, R),
      t = await KAR(a, R);
    if (!e) return {
      openFiles: t.map(WW)
    };
    let r = e.bufferPath,
      h = await qAR(e.bufferPath, e.startOffset, e.endOffset);
    return {
      openFile: WW(r),
      openFiles: t.filter(i => i !== e.bufferPath).map(WW),
      selection: h
    };
  } catch (e) {
    return J.debug("Failed to read Zed workspace state", {
      error: e instanceof Error ? e.message : String(e),
      workspaceId: R
    }), null;
  }
}