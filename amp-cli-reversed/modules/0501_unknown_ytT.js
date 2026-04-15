class ytT {
  parts = [];
  append(...T) {
    this.parts.push(...T);
  }
  toString() {
    return this.parts.join("");
  }
  reset() {
    this.parts.length = 0;
  }
  get length() {
    return this.parts.length;
  }
  get isEmpty() {
    return this.parts.length === 0;
  }
}