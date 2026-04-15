function $k0(T) {
  let R = T.key;
  if (R.length === 1 && R >= "a" && R <= "z") return R;
  if (T.code !== void 0) return T.code;
  return R;
}
class x0 {
  key;
  shift;
  ctrl;
  alt;
  meta;
  constructor(T, R = {}) {
    this.key = T, this.shift = R.shift ?? !1, this.ctrl = R.ctrl ?? !1, this.alt = R.alt ?? !1, this.meta = R.meta ?? !1;
  }
  accepts(T) {
    return $k0(T) === this.key && T.shiftKey === this.shift && T.ctrlKey === this.ctrl && T.altKey === this.alt && T.metaKey === this.meta;
  }
  static key(T) {
    return new x0(T);
  }
  static ctrl(T) {
    return new x0(T, {
      ctrl: !0
    });
  }
  static shift(T) {
    return new x0(T, {
      shift: !0
    });
  }
  static alt(T) {
    return new x0(T, {
      alt: !0
    });
  }
  static meta(T) {
    return new x0(T, {
      meta: !0
    });
  }
  modifiers() {
    let T = [];
    if (this.meta) T.push("Meta");
    if (this.ctrl) T.push("Ctrl");
    if (this.alt) T.push("Alt");
    if (this.shift) T.push("Shift");
    return T;
  }
  toString() {
    let T = this.modifiers();
    return T.length > 0 ? `${T.join("+")}+${this.key}` : this.key;
  }
}