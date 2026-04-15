function mg0(T, R) {
  let a = R.tagID;
  if (LYT.has(a)) {
    if (T.openElements.hasInTableScope(sT.CAPTION)) T.openElements.generateImpliedEndTags(), T.openElements.popUntilTagNamePopped(sT.CAPTION), T.activeFormattingElements.clearToLastMarker(), T.insertionMode = YT.IN_TABLE, Qk(T, R);
  } else bt(T, R);
}