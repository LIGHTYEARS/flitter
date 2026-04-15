function AAT(T, R) {
  var a = Object.keys(T);
  if (Object.getOwnPropertySymbols) {
    var e = Object.getOwnPropertySymbols(T);
    R && (e = e.filter(function (t) {
      return Object.getOwnPropertyDescriptor(T, t).enumerable;
    })), a.push.apply(a, e);
  }
  return a;
}