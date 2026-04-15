class TR {
  left;
  top;
  right;
  bottom;
  constructor(T, R, a, e) {
    if (typeof T === "object") this.left = T.left ?? 0, this.top = T.top ?? 0, this.right = T.right ?? 0, this.bottom = T.bottom ?? 0;else this.left = T, this.top = R ?? 0, this.right = a ?? 0, this.bottom = e ?? 0;
  }
  static all(T) {
    return new TR(T, T, T, T);
  }
  static symmetric(T = 0, R = 0) {
    return new TR(T, R, T, R);
  }
  static horizontal(T) {
    return new TR(T, 0, T, 0);
  }
  static vertical(T) {
    return new TR(0, T, 0, T);
  }
  static only(T) {
    return new TR(T.left ?? 0, T.top ?? 0, T.right ?? 0, T.bottom ?? 0);
  }
  get horizontal() {
    return this.left + this.right;
  }
  get vertical() {
    return this.top + this.bottom;
  }
}