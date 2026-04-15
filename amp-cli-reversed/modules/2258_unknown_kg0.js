function Pg0(T, R) {
  let a = R.tagID;
  if (LYT.has(a)) {
    if (T.openElements.hasInTableScope(sT.TD) || T.openElements.hasInTableScope(sT.TH)) T._closeTableCell(), UH(T, R);
  } else bt(T, R);
}
function kg0(T, R) {
  let a = R.tagID;
  switch (a) {
    case sT.TD:
    case sT.TH:
      {
        if (T.openElements.hasInTableScope(a)) T.openElements.generateImpliedEndTags(), T.openElements.popUntilTagNamePopped(a), T.activeFormattingElements.clearToLastMarker(), T.insertionMode = YT.IN_ROW;
        break;
      }
    case sT.TABLE:
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
    case sT.TR:
      {
        if (T.openElements.hasInTableScope(a)) T._closeTableCell(), MYT(T, R);
        break;
      }
    case sT.BODY:
    case sT.CAPTION:
    case sT.COL:
    case sT.COLGROUP:
    case sT.HTML:
      break;
    default:
      BH(T, R);
  }
}