class CQT {
  fileBuffer;
  size;
  offset;
  error;
  constructor(T, R) {
    this.fileBuffer = T, this.size = R, this.offset = 0, this.error = !1;
  }
  hasError() {
    return this.error;
  }
  nextByte() {
    if (this.offset === this.size || this.hasError()) return this.error = !0, 255;
    return this.fileBuffer[this.offset++];
  }
  next(T) {
    if (T < 0 || T > this.size - this.offset) return this.error = !0, [];
    let R = [];
    for (let a = 0; a < T; a++) {
      if (this.error) return R;
      R[a] = this.nextByte();
    }
    return R;
  }
}