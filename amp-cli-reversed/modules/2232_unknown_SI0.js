function $I0(T, R) {
  if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  T._insertElement(R, VR.HTML);
}
function vI0(T, R) {
  if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  if (qY.has(T.openElements.currentTagId)) T.openElements.pop();
  T._insertElement(R, VR.HTML);
}
function jI0(T, R) {
  if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
  T._insertElement(R, VR.HTML), T.skipNextNewLine = !0, T.framesetOk = !1;
}
function SI0(T, R) {
  let a = T.openElements.tmplCount > 0;
  if (!T.formElement || a) {
    if (T.openElements.hasInButtonScope(sT.P)) T._closePElement();
    if (T._insertElement(R, VR.HTML), !a) T.formElement = T.openElements.current;
  }
}