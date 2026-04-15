function PI0(T, R) {
  switch (R.tagID) {
    case sT.NOSCRIPT:
      {
        T.openElements.pop(), T.insertionMode = YT.IN_HEAD;
        break;
      }
    case sT.BR:
      {
        Mv(T, R);
        break;
      }
    default:
      T._err(R, vR.endTagWithoutMatchingOpenElement);
  }
}