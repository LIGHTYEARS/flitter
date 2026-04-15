function x$0(T, R, a) {
  let e = this,
    t = 0,
    r,
    h;
  return i;
  function i(l) {
    return T.enter("characterReference"), T.enter("characterReferenceMarker"), T.consume(l), T.exit("characterReferenceMarker"), c;
  }
  function c(l) {
    if (l === 35) return T.enter("characterReferenceMarkerNumeric"), T.consume(l), T.exit("characterReferenceMarkerNumeric"), s;
    return T.enter("characterReferenceValue"), r = 31, h = Sr, A(l);
  }
  function s(l) {
    if (l === 88 || l === 120) return T.enter("characterReferenceMarkerHexadecimal"), T.consume(l), T.exit("characterReferenceMarkerHexadecimal"), T.enter("characterReferenceValue"), r = 6, h = h$0, A;
    return T.enter("characterReferenceValue"), r = 7, h = KY, A(l);
  }
  function A(l) {
    if (l === 59 && t) {
      let o = T.exit("characterReferenceValue");
      if (h === Sr && !arT(e.sliceSerialize(o))) return a(l);
      return T.enter("characterReferenceMarker"), T.consume(l), T.exit("characterReferenceMarker"), T.exit("characterReference"), R;
    }
    if (h(l) && t++ < r) return T.consume(l), A;
    return a(l);
  }
}