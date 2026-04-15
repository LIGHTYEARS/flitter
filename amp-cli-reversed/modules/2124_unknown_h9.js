class h9 {
  top;
  right;
  bottom;
  left;
  constructor(T, R, a, e) {
    this.top = T, this.right = R, this.bottom = a, this.left = e;
  }
  static all(T) {
    return new h9(T, T, T, T);
  }
  static symmetric(T, R) {
    return new h9(R, T, R, T);
  }
}