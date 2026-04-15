function uI0(T, R) {
  switch (R.tagID) {
    case sT.HEAD:
      {
        T.openElements.pop(), T.insertionMode = YT.AFTER_HEAD;
        break;
      }
    case sT.BODY:
    case sT.BR:
    case sT.HTML:
      {
        Lv(T, R);
        break;
      }
    case sT.TEMPLATE:
      {
        Vm(T, R);
        break;
      }
    default:
      T._err(R, vR.endTagWithoutMatchingOpenElement);
  }
}