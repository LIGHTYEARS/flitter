class oh {
  bits;
  constructor(T) {
    this.bits = T;
  }
  static empty() {
    return new oh(0n);
  }
  static fromString(T) {
    let R = 0n;
    for (let a = 0; a < T.length; a++) {
      let e = T.charCodeAt(a),
        t = oh.charToBitIndex(e);
      if (t >= 0) R |= 1n << BigInt(t);
    }
    return new oh(R);
  }
  static fromPath(T) {
    let R = 0n,
      a = T.split(/[/\\]/);
    for (let e of a) {
      if (e === "" || e === "." || e === "..") continue;
      for (let t = 0; t < e.length; t++) {
        let r = e.charCodeAt(t),
          h = oh.charToBitIndex(r);
        if (h >= 0) R |= 1n << BigInt(h);
      }
    }
    return new oh(R);
  }
  hasChars(T) {
    return (this.bits & T.bits) === T.bits;
  }
  union(T) {
    return new oh(this.bits | T.bits);
  }
  intersection(T) {
    return new oh(this.bits & T.bits);
  }
  isEmpty() {
    return this.bits === 0n;
  }
  getCharCount() {
    return this.bits.toString(2).split("").filter(T => T === "1").length;
  }
  toString() {
    let T = [];
    for (let R = 0; R < 64; R++) if ((this.bits & 1n << BigInt(R)) !== 0n) {
      let a = oh.bitIndexToChar(R);
      if (a) T.push(a);
    }
    return `CharBag{${T.join("")}}`;
  }
  toJSON() {
    return {
      bits: this.bits.toString()
    };
  }
  static fromJSON(T) {
    return new oh(BigInt(T.bits));
  }
  equals(T) {
    return this.bits === T.bits;
  }
  static charToBitIndex(T) {
    if (T >= 65 && T <= 90) T += 32;
    if (T >= 48 && T <= 57) return T - 48;
    if (T >= 97 && T <= 122) return T - 97 + 10;
    return -1;
  }
  static bitIndexToChar(T) {
    if (T >= 0 && T <= 9) return String.fromCharCode(48 + T);
    if (T >= 10 && T <= 35) return String.fromCharCode(97 + T - 10);
    return null;
  }
}