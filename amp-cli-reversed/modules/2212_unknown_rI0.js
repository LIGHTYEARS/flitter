function rI0(T, R) {
  let a = T.activeFormattingElements.getElementEntryInScopeWithTagName(R.tagName);
  if (a) {
    if (!T.openElements.contains(a.element)) T.activeFormattingElements.removeEntry(a), a = null;else if (!T.openElements.hasInScope(R.tagID)) a = null;
  } else OYT(T, R);
  return a;
}