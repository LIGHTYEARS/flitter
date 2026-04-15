function Ig0(T, R) {
  switch (R.tagID) {
    case sT.BASE:
    case sT.BASEFONT:
    case sT.BGSOUND:
    case sT.LINK:
    case sT.META:
    case sT.NOFRAMES:
    case sT.SCRIPT:
    case sT.STYLE:
    case sT.TEMPLATE:
    case sT.TITLE:
      {
        Bc(T, R);
        break;
      }
    case sT.CAPTION:
    case sT.COLGROUP:
    case sT.TBODY:
    case sT.TFOOT:
    case sT.THEAD:
      {
        T.tmplInsertionModeStack[0] = YT.IN_TABLE, T.insertionMode = YT.IN_TABLE, Qk(T, R);
        break;
      }
    case sT.COL:
      {
        T.tmplInsertionModeStack[0] = YT.IN_COLUMN_GROUP, T.insertionMode = YT.IN_COLUMN_GROUP, TrT(T, R);
        break;
      }
    case sT.TR:
      {
        T.tmplInsertionModeStack[0] = YT.IN_TABLE_BODY, T.insertionMode = YT.IN_TABLE_BODY, NH(T, R);
        break;
      }
    case sT.TD:
    case sT.TH:
      {
        T.tmplInsertionModeStack[0] = YT.IN_ROW, T.insertionMode = YT.IN_ROW, UH(T, R);
        break;
      }
    default:
      T.tmplInsertionModeStack[0] = YT.IN_BODY, T.insertionMode = YT.IN_BODY, bt(T, R);
  }
}