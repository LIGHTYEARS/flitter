function tgT(T, R) {
  let a = tTR(T, ew0),
    e = {};
  for (let t = 0; t < a.length; t++) {
    if (a[t][1].length === 0) return ma("InvalidAttr", "Attribute '" + a[t][2] + "' has no space in starting.", vg(a[t]));else if (a[t][3] !== void 0 && a[t][4] === void 0) return ma("InvalidAttr", "Attribute '" + a[t][2] + "' is without value.", vg(a[t]));else if (a[t][3] === void 0 && !R.allowBooleanAttributes) return ma("InvalidAttr", "boolean attribute '" + a[t][2] + "' is not allowed.", vg(a[t]));
    let r = a[t][2];
    if (!hw0(r)) return ma("InvalidAttr", "Attribute '" + r + "' is an invalid name.", vg(a[t]));
    if (!e.hasOwnProperty(r)) e[r] = 1;else return ma("InvalidAttr", "Attribute '" + r + "' is repeated.", vg(a[t]));
  }
  return !0;
}