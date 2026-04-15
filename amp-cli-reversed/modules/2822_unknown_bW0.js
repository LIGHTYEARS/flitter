function _W0(T) {
  if (T?.status === "done" && typeof T.result === "object" && T.result !== null && "files" in T.result && Array.isArray(T.result.files)) return T.result;
  return;
}
function bW0(T) {
  if (!T) return;
  let R = T.files;
  if (R.length === 0) return;
  let a = R.reduce((t, r) => t + r.additions, 0),
    e = R.reduce((t, r) => t + r.deletions, 0);
  return {
    fileCount: R.length,
    primaryFile: R[0]?.path ?? "file",
    totalAdditions: a,
    totalDeletions: e
  };
}