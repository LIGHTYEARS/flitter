function pAT(T) {
  for (var R = 1; R < arguments.length; R++) {
    var a = arguments[R] != null ? arguments[R] : {};
    R % 2 ? AAT(Object(a), !0).forEach(function (e) {
      yfR(T, e, a[e]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(T, Object.getOwnPropertyDescriptors(a)) : AAT(Object(a)).forEach(function (e) {
      Object.defineProperty(T, e, Object.getOwnPropertyDescriptor(a, e));
    });
  }
  return T;
}