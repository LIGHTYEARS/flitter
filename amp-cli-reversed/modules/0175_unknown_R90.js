function bw(T) {
  return typeof T === "symbol";
}
function mw(T) {
  return Object.prototype.toString.call(T) === "[object Object]";
}
function T90(T) {
  return T !== null && typeof T === "object" && typeof T.next === "function";
}
function R90(T, R, a, e, t) {
  let r = T?.next;
  if (typeof r !== "function") return T;
  if (R.name === "entries") T.next = function () {
    let h = r.call(this);
    if (h && h.done === !1) h.value[0] = t(h.value[0], R, h.value[0], e), h.value[1] = t(h.value[1], R, h.value[0], e);
    return h;
  };else if (R.name === "values") {
    let h = a[peT].keys();
    T.next = function () {
      let i = r.call(this);
      if (i && i.done === !1) i.value = t(i.value, R, h.next().value, e);
      return i;
    };
  } else T.next = function () {
    let h = r.call(this);
    if (h && h.done === !1) h.value = t(h.value, R, h.value, e);
    return h;
  };
  return T;
}