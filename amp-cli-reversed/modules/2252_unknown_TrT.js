function TrT(T, R) {
  switch (R.tagID) {
    case sT.HTML:
      {
        bt(T, R);
        break;
      }
    case sT.COL:
      {
        T._appendElement(R, VR.HTML), R.ackSelfClosing = !0;
        break;
      }
    case sT.TEMPLATE:
      {
        Bc(T, R);
        break;
      }
    default:
      Qw(T, R);
  }
}