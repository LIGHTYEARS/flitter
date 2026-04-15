class KYT {
  constructor(T) {
    this.left = T ? [...T] : [], this.right = [];
  }
  get(T) {
    if (T < 0 || T >= this.left.length + this.right.length) throw RangeError("Cannot access index `" + T + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
    if (T < this.left.length) return this.left[T];
    return this.right[this.right.length - T + this.left.length - 1];
  }
  get length() {
    return this.left.length + this.right.length;
  }
  shift() {
    return this.setCursor(0), this.right.pop();
  }
  slice(T, R) {
    let a = R === null || R === void 0 ? Number.POSITIVE_INFINITY : R;
    if (a < this.left.length) return this.left.slice(T, a);
    if (T > this.left.length) return this.right.slice(this.right.length - a + this.left.length, this.right.length - T + this.left.length).reverse();
    return this.left.slice(T).concat(this.right.slice(this.right.length - a + this.left.length).reverse());
  }
  splice(T, R, a) {
    let e = R || 0;
    this.setCursor(Math.trunc(T));
    let t = this.right.splice(this.right.length - e, Number.POSITIVE_INFINITY);
    if (a) fg(this.left, a);
    return t.reverse();
  }
  pop() {
    return this.setCursor(Number.POSITIVE_INFINITY), this.left.pop();
  }
  push(T) {
    this.setCursor(Number.POSITIVE_INFINITY), this.left.push(T);
  }
  pushMany(T) {
    this.setCursor(Number.POSITIVE_INFINITY), fg(this.left, T);
  }
  unshift(T) {
    this.setCursor(0), this.right.push(T);
  }
  unshiftMany(T) {
    this.setCursor(0), fg(this.right, T.reverse());
  }
  setCursor(T) {
    if (T === this.left.length || T > this.left.length && this.right.length === 0 || T < 0 && this.left.length === 0) return;
    if (T < this.left.length) {
      let R = this.left.splice(T, Number.POSITIVE_INFINITY);
      fg(this.right, R.reverse());
    } else {
      let R = this.right.splice(this.left.length + this.right.length - T, Number.POSITIVE_INFINITY);
      fg(this.left, R.reverse());
    }
  }
}