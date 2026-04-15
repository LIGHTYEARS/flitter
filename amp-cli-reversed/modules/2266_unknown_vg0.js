function Zw(T, R) {
  T.insertionMode = YT.IN_BODY, wH(T, R);
}
function vg0(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.FRAMESET:
      {
        T._insertElement(R, VR.HTML);
        break;
      }
    case sT.FRAME:
      {
        T._appendElement(R, VR.HTML), R.ackSelfClosing = !0;
        break;
      }
    case sT.NOFRAMES:
      {
        Bc(T, R);
        break;
      }
    default:
  }
}