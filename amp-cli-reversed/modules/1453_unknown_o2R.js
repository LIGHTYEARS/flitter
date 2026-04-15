function o2R(T) {
  let R = TS(T),
    a = R.endLine > R.startLine;
  return {
    text: `No core explanation covered ${a ? `${R.file}#L${R.startLine}-L${R.endLine}` : `${R.file}#L${R.startLine}`}.`,
    file: R.file,
    startLine: R.startLine,
    endLine: a ? R.endLine : void 0,
    diff: T.diff
  };
}