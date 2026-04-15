function $YT(T, R) {
  T._reconstructActiveFormattingElements(), T._insertCharacters(R);
}
function vYT(T, R) {
  T._reconstructActiveFormattingElements(), T._insertCharacters(R), T.framesetOk = !1;
}
function fI0(T, R) {
  if (T.openElements.tmplCount === 0) T.treeAdapter.adoptAttributes(T.openElements.items[0], R.attrs);
}
function II0(T, R) {
  let a = T.openElements.tryPeekProperlyNestedBodyElement();
  if (a && T.openElements.tmplCount === 0) T.framesetOk = !1, T.treeAdapter.adoptAttributes(a, R.attrs);
}
function gI0(T, R) {
  let a = T.openElements.tryPeekProperlyNestedBodyElement();
  if (T.framesetOk && a) T.treeAdapter.detachNode(a), T.openElements.popAllUpToHtmlElement(), T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_FRAMESET;
}