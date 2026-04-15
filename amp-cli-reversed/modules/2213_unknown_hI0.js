function hI0(T, R) {
  let a = null,
    e = T.openElements.stackTop;
  for (; e >= 0; e--) {
    let t = T.openElements.items[e];
    if (t === R.element) break;
    if (T._isSpecialElement(t, T.openElements.tagIDs[e])) a = t;
  }
  if (!a) T.openElements.shortenToLength(e < 0 ? 0 : e), T.activeFormattingElements.removeEntry(R);
  return a;
}