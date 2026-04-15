function eMR(T, R) {
  hn(T, R);
  let a = T == null ? void 0 : T.readable;
  ZV(a, "readable", "ReadableWritablePair"), function (t, r) {
    if (!i$(t)) throw TypeError(`${r} is not a ReadableStream.`);
  }(a, `${R} has member 'readable' that`);
  let e = T == null ? void 0 : T.writable;
  return ZV(e, "writable", "ReadableWritablePair"), function (t, r) {
    if (!XUT(t)) throw TypeError(`${r} is not a WritableStream.`);
  }(e, `${R} has member 'writable' that`), {
    readable: a,
    writable: e
  };
}