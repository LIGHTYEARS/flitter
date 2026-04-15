function kS(T, R) {
  switch (R.tagID) {
    case sT.TABLE:
      {
        if (T.openElements.hasInTableScope(sT.TABLE)) T.openElements.popUntilTagNamePopped(sT.TABLE), T._resetInsertionMode();
        break;
      }
    case sT.TEMPLATE:
      {
        Vm(T, R);
        break;
      }
    case sT.BODY:
    case sT.CAPTION:
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
      ZO(T, R);
  }
}