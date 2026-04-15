class lzT {
  maxSize;
  map = new Map();
  constructor(T) {
    this.maxSize = T;
  }
  get(T) {
    if (this.map.has(T)) {
      let R = this.map.get(T);
      return this.map.delete(T), this.map.set(T, R), R;
    }
    return;
  }
  set(T, R) {
    if (this.map.delete(T), this.map.size >= this.maxSize) {
      let a = this.map.keys().next().value;
      if (a !== void 0) this.map.delete(a);
    }
    this.map.set(T, R);
  }
  has(T) {
    return this.map.has(T);
  }
  delete(T) {
    return this.map.delete(T);
  }
  deleteByPrefix(T) {
    for (let R of this.map.keys()) if (typeof R === "string" && R.startsWith(T)) this.map.delete(R);
  }
  get size() {
    return this.map.size;
  }
}