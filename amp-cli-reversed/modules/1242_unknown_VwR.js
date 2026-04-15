async function VwR(T, R, a) {
  let e = [];
  for (let t of T) {
    if (!Pj(t)) continue;
    let r = t.fsPath;
    if (!(await GwR(r))) continue;
    try {
      let h = await zwR(FwR(r, R, a), XwR);
      if (h) e.push(h);
    } catch (h) {
      J.debug("Auto-snapshot failed", {
        workspacePath: r,
        threadId: R,
        messageId: a,
        error: h
      });
    }
  }
  return e;
}