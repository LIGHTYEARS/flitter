function WET(T) {
  if (!("patchText" in T) || typeof T.patchText !== "string") return [];
  let R;
  try {
    R = XS(T.patchText);
  } catch (e) {
    return J.debug("thread.diffStats.applyPatch.parseFailed", {
      error: e,
      patchTextLength: T.patchText.length
    }), [];
  }
  let a = [];
  for (let e of R.hunks) {
    if (e.type === "delete") continue;
    if (e.type === "add") {
      a.push({
        path: e.path,
        diffStat: xx(e.contents)
      });
      continue;
    }
    let t = OET(e.chunks.map(r => kx(r.oldLines.join(`
`), r.newLines.join(`
`))));
    a.push({
      path: e.movePath ?? e.path,
      diffStat: t
    });
  }
  return a;
}