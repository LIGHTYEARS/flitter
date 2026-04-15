function xx(T) {
  if (typeof T !== "string") return {
    added: 0,
    deleted: 0,
    changed: 0
  };
  return {
    added: T.split(`
`).length,
    deleted: 0,
    changed: 0
  };
}
function dET(T) {
  if (!T) return {
    totalFiles: 0,
    createdFiles: 0,
    totalAdded: 0,
    totalRemoved: 0,
    totalModified: 0,
    revertedFiles: 0,
    allReverted: !1
  };
  let R = T.files.length,
    a = T.files.filter(c => c.created).length,
    e = T.files.filter(c => c.reverted).length,
    t = e === R && R > 0,
    r = 0,
    h = 0,
    i = 0;
  for (let c of T.files) {
    if (c.reverted) continue;
    r += c.diffStat.added, h += c.diffStat.removed, i += c.diffStat.modified;
  }
  return {
    totalFiles: R,
    createdFiles: a,
    totalAdded: r,
    totalRemoved: h,
    totalModified: i,
    revertedFiles: e,
    allReverted: t
  };
}