function JO0(T) {
  switch (WF(T) & 7) {
    case 0:
      return WF(T), !0;
    case 1:
      return T.next(8), !0;
    case 2:
      let R = WF(T);
      return T.next(R), !0;
    case 5:
      return T.next(4), !0;
  }
  return !1;
}