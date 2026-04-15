function sg0(T, R) {
  T.openElements.clearBackToTableContext(), T.activeFormattingElements.insertMarker(), T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_CAPTION;
}
function og0(T, R) {
  T.openElements.clearBackToTableContext(), T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_COLUMN_GROUP;
}
function ng0(T, R) {
  T.openElements.clearBackToTableContext(), T._insertFakeElement(pR.COLGROUP, sT.COLGROUP), T.insertionMode = YT.IN_COLUMN_GROUP, TrT(T, R);
}
function lg0(T, R) {
  T.openElements.clearBackToTableContext(), T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_TABLE_BODY;
}
function Ag0(T, R) {
  T.openElements.clearBackToTableContext(), T._insertFakeElement(pR.TBODY, sT.TBODY), T.insertionMode = YT.IN_TABLE_BODY, NH(T, R);
}
function pg0(T, R) {
  if (T.openElements.hasInTableScope(sT.TABLE)) T.openElements.popUntilTagNamePopped(sT.TABLE), T._resetInsertionMode(), T._processStartTag(R);
}
function _g0(T, R) {
  if (SYT(R)) T._appendElement(R, VR.HTML);else ZO(T, R);
  R.ackSelfClosing = !0;
}
function bg0(T, R) {
  if (!T.formElement && T.openElements.tmplCount === 0) T._insertElement(R, VR.HTML), T.formElement = T.openElements.current, T.openElements.pop();
}
function Qk(T, R) {
  switch (R.tagID) {
    case sT.TD:
    case sT.TH:
    case sT.TR:
      {
        Ag0(T, R);
        break;
      }
    case sT.STYLE:
    case sT.SCRIPT:
    case sT.TEMPLATE:
      {
        Bc(T, R);
        break;
      }
    case sT.COL:
      {
        ng0(T, R);
        break;
      }
    case sT.FORM:
      {
        bg0(T, R);
        break;
      }
    case sT.TABLE:
      {
        pg0(T, R);
        break;
      }
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
      {
        lg0(T, R);
        break;
      }
    case sT.INPUT:
      {
        _g0(T, R);
        break;
      }
    case sT.CAPTION:
      {
        sg0(T, R);
        break;
      }
    case sT.COLGROUP:
      {
        og0(T, R);
        break;
      }
    default:
      ZO(T, R);
  }
}