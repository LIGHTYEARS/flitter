async function pCT(T, R) {
  if (R?.size === 0) return [];
  let a = Ai.join(bCT(T), "workspaceStorage");
  if (!(await wg(a))) return [];
  let e = await lk.promises.readdir(a, {
    withFileTypes: !0
  });
  return (await Promise.all(e.filter(t => t.isDirectory()).map(async t => {
    let r = t.name,
      h = Ai.join(a, r),
      i = Ai.join(h, "state.vscdb"),
      c = Ai.join(h, "workspace.json");
    if (!(await wg(i)) || !(await wg(c))) return null;
    let s = await IAR(c);
    if (!s || !(await wg(s))) return null;
    if (R && !R.has(SD(s))) return null;
    let A = await lk.promises.stat(i);
    return {
      storageID: r,
      workspaceFolder: s,
      stateDBPath: i,
      mtime: A.mtimeMs
    };
  }))).filter(t => t !== null).sort((t, r) => r.mtime - t.mtime).slice(0, EAR);
}