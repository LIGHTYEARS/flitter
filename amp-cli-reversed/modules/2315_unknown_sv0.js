function sv0(T, R, a) {
  return e;
  function e(l) {
    return T.enter("resource"), T.enter("resourceMarker"), T.consume(l), T.exit("resourceMarker"), t;
  }
  function t(l) {
    return o3(l) ? Bv(T, r)(l) : r(l);
  }
  function r(l) {
    if (l === 41) return A(l);
    return XYT(T, h, i, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(l);
  }
  function h(l) {
    return o3(l) ? Bv(T, c)(l) : A(l);
  }
  function i(l) {
    return a(l);
  }
  function c(l) {
    if (l === 34 || l === 39 || l === 40) return QYT(T, s, a, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(l);
    return A(l);
  }
  function s(l) {
    return o3(l) ? Bv(T, A)(l) : A(l);
  }
  function A(l) {
    if (l === 41) return T.enter("resourceMarker"), T.consume(l), T.exit("resourceMarker"), T.exit("resource"), R;
    return a(l);
  }
}