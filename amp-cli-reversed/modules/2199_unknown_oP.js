function oP(T) {
  let R = mfT({
      line: T.startLine,
      column: T.startCol,
      offset: T.startOffset
    }),
    a = mfT({
      line: T.endLine,
      column: T.endCol,
      offset: T.endOffset
    });
  return R || a ? {
    start: R,
    end: a
  } : void 0;
}