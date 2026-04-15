function ug0(T, R) {
  let a = R.tagID;
  switch (a) {
    case sT.CAPTION:
    case sT.TABLE:
      {
        if (T.openElements.hasInTableScope(sT.CAPTION)) {
          if (T.openElements.generateImpliedEndTags(), T.openElements.popUntilTagNamePopped(sT.CAPTION), T.activeFormattingElements.clearToLastMarker(), T.insertionMode = YT.IN_TABLE, a === sT.TABLE) kS(T, R);
        }
        break;
      }
    case sT.BODY:
    case sT.COL:
    case sT.COLGROUP:
    case sT.HTML:
    case sT.TBODY:
    case sT.TD:
    case sT.TFOOT:
    case sT.TH:
    case sT.THEAD:
    case sT.TR:
      break;
    default:
      BH(T, R);
  }
}