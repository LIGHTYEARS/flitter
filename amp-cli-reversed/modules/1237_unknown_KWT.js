async function KWT() {
  if (!(await Us.isConnected())) return;
  let T = await m0(Us.status),
    R = T.selections?.[0],
    a = lCT(R),
    e = a && R ? {
      line: R.range.startLine + 1,
      column: R.range.startCharacter
    } : void 0;
  return {
    currentlyVisibleFiles: T.visibleFiles ?? [],
    activeEditor: T.openFile,
    cursorLocation: e,
    cursorLocationLine: void 0,
    selectionRange: !a && R ? {
      start: {
        line: R?.range.startLine + 1,
        column: R?.range.startCharacter
      },
      end: {
        line: R?.range.endLine + 1,
        column: R?.range.endCharacter
      }
    } : void 0
  };
}