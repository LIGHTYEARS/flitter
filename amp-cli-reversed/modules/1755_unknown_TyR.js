function TyR(T) {
  if (!T) return {
    supportsFormMode: !1,
    supportsUrlMode: !1
  };
  let R = T.form !== void 0,
    a = T.url !== void 0;
  return {
    supportsFormMode: R || !R && !a,
    supportsUrlMode: a
  };
}