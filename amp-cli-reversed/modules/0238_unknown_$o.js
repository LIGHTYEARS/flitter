function $o(T, R) {
  let a = T[R];
  if (typeof a !== "function") return;
  T[R] = function (...e) {
    let t = a.apply(this, e),
      r = Ho.getMetadataFromRegistry(this);
    if (r) Ho.setMetadataInRegistry(t, r);
    return t;
  };
}