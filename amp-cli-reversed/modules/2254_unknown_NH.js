function Qw(T, R) {
  if (T.openElements.currentTagId === sT.COLGROUP) T.openElements.pop(), T.insertionMode = YT.IN_TABLE, T._processToken(R);
}
function NH(T, R) {
  switch (R.tagID) {
    case sT.TR:
      {
        T.openElements.clearBackToTableBodyContext(), T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_ROW;
        break;
      }
    case sT.TH:
    case sT.TD:
      {
        T.openElements.clearBackToTableBodyContext(), T._insertFakeElement(pR.TR, sT.TR), T.insertionMode = YT.IN_ROW, UH(T, R);
        break;
      }
    case sT.CAPTION:
    case sT.COL:
    case sT.COLGROUP:
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
      {
        if (T.openElements.hasTableBodyContextInTableScope()) T.openElements.clearBackToTableBodyContext(), T.openElements.pop(), T.insertionMode = YT.IN_TABLE, Qk(T, R);
        break;
      }
    default:
      Qk(T, R);
  }
}