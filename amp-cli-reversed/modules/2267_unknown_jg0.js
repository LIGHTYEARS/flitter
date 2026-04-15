function jg0(T, R) {
  if (R.tagID === sT.FRAMESET && !T.openElements.isRootHtmlElementCurrent()) {
    if (T.openElements.pop(), !T.fragmentContext && T.openElements.currentTagId !== sT.FRAMESET) T.insertionMode = YT.AFTER_FRAMESET;
  }
}