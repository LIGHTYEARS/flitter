function DI0(T, R) {
  T._reconstructActiveFormattingElements(), T._insertElement(R, VR.HTML), T.activeFormattingElements.insertMarker(), T.framesetOk = !1;
}
function wI0(T, R) {
  if (T.treeAdapter.getDocumentMode(T.document) !== oi.QUIRKS && T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  T._insertElement(R, VR.HTML), T.framesetOk = !1, T.insertionMode = YT.IN_TABLE;
}