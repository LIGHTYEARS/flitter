function FY(T, R) {
  let a = R.tagID;
  switch (R.tagID) {
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
      {
        if (T.openElements.hasInTableScope(a)) T.openElements.clearBackToTableBodyContext(), T.openElements.pop(), T.insertionMode = YT.IN_TABLE;
        break;
      }
    case sT.TABLE:
      {
        if (T.openElements.hasTableBodyContextInTableScope()) T.openElements.clearBackToTableBodyContext(), T.openElements.pop(), T.insertionMode = YT.IN_TABLE, kS(T, R);
        break;
      }
    case sT.BODY:
    case sT.CAPTION:
    case sT.COL:
    case sT.COLGROUP:
    case sT.HTML:
    case sT.TD:
    case sT.TH:
    case sT.TR:
      break;
    default:
      kS(T, R);
  }
}