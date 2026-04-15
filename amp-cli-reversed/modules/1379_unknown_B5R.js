function B5R(T) {
  return T.flatMap(R => R.diagnostics.map(a => ({
    message: a.description,
    severity: N5R(a.severity),
    source: void 0,
    uri: R.uri,
    range: {
      type: "full",
      start: {
        line: a.range.startLine + 1,
        character: a.range.startCharacter
      },
      end: {
        line: a.range.endLine + 1,
        character: a.range.endCharacter
      }
    }
  })));
}