function N4(T, R = 0) {
  return Number.isFinite(T) ? T : R;
}
class o0 {
  minWidth;
  maxWidth;
  minHeight;
  maxHeight;
  constructor(T, R, a, e) {
    if (typeof T === "object") this.minWidth = T.minWidth ?? 0, this.maxWidth = T.maxWidth ?? 1 / 0, this.minHeight = T.minHeight ?? 0, this.maxHeight = T.maxHeight ?? 1 / 0;else this.minWidth = T ?? 0, this.maxWidth = R ?? 1 / 0, this.minHeight = a ?? 0, this.maxHeight = e ?? 1 / 0;
  }
  static tight(T, R) {
    return new o0(T, T, R, R);
  }
  static loose(T, R) {
    return new o0(0, T, 0, R);
  }
  get hasBoundedWidth() {
    return this.maxWidth !== 1 / 0;
  }
  get hasBoundedHeight() {
    return this.maxHeight !== 1 / 0;
  }
  get hasTightWidth() {
    return this.minWidth >= this.maxWidth;
  }
  get hasTightHeight() {
    return this.minHeight >= this.maxHeight;
  }
  constrain(T, R) {
    return e8(isFinite(T), `BoxConstraints.constrain received infinite width: ${T}. This indicates a layout bug where a widget is not properly calculating its desired size.`), e8(isFinite(R), `BoxConstraints.constrain received infinite height: ${R}. This indicates a layout bug where a widget is not properly calculating its desired size.`), {
      width: Math.max(this.minWidth, Math.min(this.maxWidth, T)),
      height: Math.max(this.minHeight, Math.min(this.maxHeight, R))
    };
  }
  enforce(T) {
    let R = (a, e, t) => Math.max(e, Math.min(t, a));
    return new o0(R(T.minWidth, this.minWidth, this.maxWidth), R(T.maxWidth, this.minWidth, this.maxWidth), R(T.minHeight, this.minHeight, this.maxHeight), R(T.maxHeight, this.minHeight, this.maxHeight));
  }
  get biggest() {
    return {
      width: this.maxWidth,
      height: this.maxHeight
    };
  }
  get smallest() {
    return {
      width: this.minWidth,
      height: this.minHeight
    };
  }
  loosen() {
    return new o0(0, this.maxWidth, 0, this.maxHeight);
  }
  tighten({
    width: T,
    height: R
  } = {}) {
    return new o0(T === void 0 ? this.minWidth : Math.max(this.minWidth, Math.min(this.maxWidth, T)), T === void 0 ? this.maxWidth : Math.max(this.minWidth, Math.min(this.maxWidth, T)), R === void 0 ? this.minHeight : Math.max(this.minHeight, Math.min(this.maxHeight, R)), R === void 0 ? this.maxHeight : Math.max(this.minHeight, Math.min(this.maxHeight, R)));
  }
  static tightFor({
    width: T,
    height: R
  } = {}) {
    return new o0(T ?? 0, T ?? 1 / 0, R ?? 0, R ?? 1 / 0);
  }
  equals(T) {
    return this.minWidth === T.minWidth && this.maxWidth === T.maxWidth && this.minHeight === T.minHeight && this.maxHeight === T.maxHeight;
  }
}