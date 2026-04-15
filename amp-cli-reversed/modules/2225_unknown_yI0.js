function Lv(T, R) {
  T.openElements.pop(), T.insertionMode = YT.AFTER_HEAD, T._processToken(R);
}
function yI0(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.BASEFONT:
    case sT.BGSOUND:
    case sT.HEAD:
    case sT.LINK:
    case sT.META:
    case sT.NOFRAMES:
    case sT.STYLE:
      {
        Bc(T, R);
        break;
      }
    case sT.NOSCRIPT:
      {
        T._err(R, vR.nestedNoscriptInHead);
        break;
      }
    default:
      Mv(T, R);
  }
}