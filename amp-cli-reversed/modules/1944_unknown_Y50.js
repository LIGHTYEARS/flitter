function Y50(T) {
  if (T.status !== "done") return;
  if (typeof T.result !== "object" || T.result === null || !("files" in T.result)) return;
  let R = T.result;
  if (typeof R !== "object" || R === null || !("files" in R)) return;
  let a = R.files;
  if (!Array.isArray(a) || a.length === 0) return;
  let e = a.reduce((h, i) => h + i.additions, 0),
    t = a.reduce((h, i) => h + i.deletions, 0),
    r = e + t;
  return {
    fileCount: a.length,
    totalAdditions: e,
    totalDeletions: t,
    totalChanges: r
  };
}