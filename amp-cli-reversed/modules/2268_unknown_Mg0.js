function Sg0(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.NOFRAMES:
      {
        Bc(T, R);
        break;
      }
    default:
  }
}
function Og0(T, R) {
  if (R.tagID === sT.HTML) T.insertionMode = YT.AFTER_AFTER_FRAMESET;
}
function dg0(T, R) {
  if (R.tagID === sT.HTML) bt(T, R);else HM(T, R);
}
function HM(T, R) {
  T.insertionMode = YT.IN_BODY, wH(T, R);
}
function Eg0(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.NOFRAMES:
      {
        Bc(T, R);
        break;
      }
    default:
  }
}
function Cg0(T, R) {
  R.chars = M3, T._insertCharacters(R);
}
function Lg0(T, R) {
  T._insertCharacters(R), T.framesetOk = !1;
}
function UYT(T) {
  while (T.treeAdapter.getNamespaceURI(T.openElements.current) !== VR.HTML && !T._isIntegrationPoint(T.openElements.currentTagId, T.openElements.current)) T.openElements.pop();
}
function Mg0(T, R) {
  if (Yf0(R)) UYT(T), T._startTagOutsideForeignContent(R);else {
    let a = T._getAdjustedCurrentElement(),
      e = T.treeAdapter.getNamespaceURI(a);
    if (e === VR.MATHML) fYT(R);else if (e === VR.SVG) Qf0(R), IYT(R);
    if (YtT(R), R.selfClosing) T._appendElement(R, e);else T._insertElement(R, e);
    R.ackSelfClosing = !0;
  }
}