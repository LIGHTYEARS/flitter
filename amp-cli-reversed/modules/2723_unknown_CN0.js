function CN0(T) {
  let R = B9(T.currentDraftText),
    a = Math.max(0, Math.min(T.currentCursorPosition, R.length)),
    e = T.currentDraftText.length > 0 ? `

` : "",
    t = `${T.submittedText}${e}`,
    r = B9(t).length;
  return {
    nextDraftText: `${t}${T.currentDraftText}`,
    nextCursorPosition: r + a
  };
}