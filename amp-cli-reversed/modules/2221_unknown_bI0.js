function kg(T, R) {
  T._err(R, vR.missingDoctype, !0), T.treeAdapter.setDocumentMode(T.document, oi.QUIRKS), T.insertionMode = YT.BEFORE_HTML, T._processToken(R);
}
function pI0(T, R) {
  if (R.tagID === sT.HTML) T._insertElement(R, VR.HTML), T.insertionMode = YT.BEFORE_HEAD;else Ev(T, R);
}
function _I0(T, R) {
  let a = R.tagID;
  if (a === sT.HTML || a === sT.HEAD || a === sT.BODY || a === sT.BR) Ev(T, R);
}
function Ev(T, R) {
  T._insertFakeRootElement(), T.insertionMode = YT.BEFORE_HEAD, T._processToken(R);
}
function bI0(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.HEAD:
      {
        T._insertElement(R, VR.HTML), T.headElement = T.openElements.current, T.insertionMode = YT.IN_HEAD;
        break;
      }
    default:
      Cv(T, R);
  }
}