function Dv(T, R) {
  T._insertFakeElement(pR.BODY, sT.BODY), T.insertionMode = YT.IN_BODY, wH(T, R);
}
function wH(T, R) {
  switch (R.type) {
    case u8.CHARACTER:
      {
        vYT(T, R);
        break;
      }
    case u8.WHITESPACE_CHARACTER:
      {
        $YT(T, R);
        break;
      }
    case u8.COMMENT:
      {
        zY(T, R);
        break;
      }
    case u8.START_TAG:
      {
        bt(T, R);
        break;
      }
    case u8.END_TAG:
      {
        BH(T, R);
        break;
      }
    case u8.EOF:
      {
        dYT(T, R);
        break;
      }
    default:
  }
}