function Rg0(T) {
  if (!T.openElements.hasInButtonScope(sT.P)) T._insertFakeElement(pR.P, sT.P);
  T._closePElement();
}
function ag0(T) {
  if (T.openElements.hasInListItemScope(sT.LI)) T.openElements.generateImpliedEndTagsWithExclusion(sT.LI), T.openElements.popUntilTagNamePopped(sT.LI);
}
function eg0(T, R) {
  let a = R.tagID;
  if (T.openElements.hasInScope(a)) T.openElements.generateImpliedEndTagsWithExclusion(a), T.openElements.popUntilTagNamePopped(a);
}
function tg0(T) {
  if (T.openElements.hasNumberedHeaderInScope()) T.openElements.generateImpliedEndTags(), T.openElements.popUntilNumberedHeaderPopped();
}
function rg0(T, R) {
  let a = R.tagID;
  if (T.openElements.hasInScope(a)) T.openElements.generateImpliedEndTags(), T.openElements.popUntilTagNamePopped(a), T.activeFormattingElements.clearToLastMarker();
}