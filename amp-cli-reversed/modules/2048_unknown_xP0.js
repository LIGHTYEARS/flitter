async function PP0(T, R) {
  return await T.readFile(kP0(R));
}
function kP0(T) {
  let R = yh.posix.normalize(`/${T}`);
  return d0(zR.file(R));
}
async function xP0(T) {
  try {
    let R = await T.readRemoteFile(T.relativePath);
    return {
      outcome: await gXT({
        repoRoot: T.repoRoot,
        relativePath: T.relativePath,
        content: R
      })
    };
  } catch (R) {
    let a = vXT(R);
    if (a !== "NOT_FOUND" && a !== "IS_DIRECTORY") throw R;
    return {
      outcome: (await $XT(vtT(T.repoRoot, T.relativePath))) ? "deleted" : "unchanged"
    };
  }
}