function yg0(T, R) {
  switch (R.tagID) {
    case sT.COLGROUP:
      {
        if (T.openElements.currentTagId === sT.COLGROUP) T.openElements.pop(), T.insertionMode = YT.IN_TABLE;
        break;
      }
    case sT.TEMPLATE:
      {
        Vm(T, R);
        break;
      }
    case sT.COL:
      break;
    default:
      Qw(T, R);
  }
}