function MYT(T, R) {
  switch (R.tagID) {
    case sT.TR:
      {
        if (T.openElements.hasInTableScope(sT.TR)) T.openElements.clearBackToTableRowContext(), T.openElements.pop(), T.insertionMode = YT.IN_TABLE_BODY;
        break;
      }
    case sT.TABLE:
      {
        if (T.openElements.hasInTableScope(sT.TR)) T.openElements.clearBackToTableRowContext(), T.openElements.pop(), T.insertionMode = YT.IN_TABLE_BODY, FY(T, R);
        break;
      }
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
      {
        if (T.openElements.hasInTableScope(R.tagID) || T.openElements.hasInTableScope(sT.TR)) T.openElements.clearBackToTableRowContext(), T.openElements.pop(), T.insertionMode = YT.IN_TABLE_BODY, FY(T, R);
        break;
      }
    case sT.BODY:
    case sT.CAPTION:
    case sT.COL:
    case sT.COLGROUP:
    case sT.HTML:
    case sT.TD:
    case sT.TH:
      break;
    default:
      kS(T, R);
  }
}