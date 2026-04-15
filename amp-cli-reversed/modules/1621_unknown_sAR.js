async function sAR(T, R) {
  if (!R.pid || !aO(R.pid)) return null;
  let a = R.workspaceFolders[0];
  if (!a) return null;
  let e = await _CT(T),
    t = (await pCT(T, e)).find(h => SD(h.workspaceFolder) === SD(a));
  if (!t) return null;
  let r = await pAR(t.stateDBPath);
  if (!r) return {
    openFiles: []
  };
  return r;
}