function wCT(T, R) {
  return d2(T.workspaceFolders.map(Oj), R);
}
function d2(T, R) {
  return T.some(a => R.startsWith(a) || a.startsWith(R));
}
async function opR() {
  let T = await BCT();
  for (let R of T) {
    let a = await NCT(R);
    if (!a || a.connection !== "query" && AN(a.ideName) || !aO(a.pid)) try {
      await Sj.promises.unlink(R);
    } catch (e) {
      J.debug("Failed to remove IDE lockfile", {
        path: R,
        error: e instanceof Error ? e.message : String(e)
      });
    }
  }
}