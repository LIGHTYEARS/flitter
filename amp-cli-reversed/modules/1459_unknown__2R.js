function _2R(T) {
  let R = T.text.trim();
  if (!R) return;
  let a = typeof T.file === "string" ? T.file.trim() : void 0,
    e = a && a.length > 0 ? a : void 0,
    t = p2R(T.lineRanges, e),
    r = typeof T.diff === "string" ? T.diff.trim() : void 0;
  return {
    text: R,
    file: e,
    lineRanges: t,
    diff: r && r.length > 0 ? r : void 0
  };
}