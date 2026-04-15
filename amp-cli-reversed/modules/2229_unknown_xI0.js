function xI0(T, R) {
  switch (R.tagID) {
    case sT.BODY:
    case sT.HTML:
    case sT.BR:
      {
        Dv(T, R);
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