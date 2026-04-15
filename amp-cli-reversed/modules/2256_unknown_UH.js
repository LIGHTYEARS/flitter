function UH(T, R) {
  switch (R.tagID) {
    case sT.TH:
    case sT.TD:
      {
        T.openElements.clearBackToTableRowContext(), T._insertElement(R, VR.HTML), T.insertionMode = YT.IN_CELL, T.activeFormattingElements.insertMarker();
        break;
      }
    case sT.CAPTION:
    case sT.COL:
    case sT.COLGROUP:
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
    case sT.TR:
      {
        if (T.openElements.hasInTableScope(sT.TR)) T.openElements.clearBackToTableRowContext(), T.openElements.pop(), T.insertionMode = YT.IN_TABLE_BODY, NH(T, R);
        break;
      }
    default:
      Qk(T, R);
  }
}