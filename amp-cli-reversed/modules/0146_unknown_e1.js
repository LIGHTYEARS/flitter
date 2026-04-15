function e1(T) {
  if (!T) throw Error("Structure is required in record definition");
  function R() {
    let a = L0[CR++];
    if (a = a & 31, a > 23) switch (a) {
      case 24:
        a = L0[CR++];
        break;
      case 25:
        a = St.getUint16(CR), CR += 2;
        break;
      case 26:
        a = St.getUint32(CR), CR += 4;
        break;
      default:
        throw Error("Expected array header, but got " + L0[CR - 1]);
    }
    let e = this.compiledReader;
    while (e) {
      if (e.propertyCount === a) return e(r8);
      e = e.next;
    }
    if (this.slowReads++ >= x2T) {
      let r = this.length == a ? this : this.slice(0, a);
      if (e = R8.keyMap ? Function("r", "return {" + r.map(h => R8.decodeKey(h)).map(h => wyT.test(h) ? ii(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}") : Function("r", "return {" + r.map(h => wyT.test(h) ? ii(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}"), this.compiledReader) e.next = this.compiledReader;
      return e.propertyCount = a, this.compiledReader = e, e(r8);
    }
    let t = {};
    if (R8.keyMap) for (let r = 0; r < a; r++) t[ii(R8.decodeKey(this[r]))] = r8();else for (let r = 0; r < a; r++) t[ii(this[r])] = r8();
    return t;
  }
  return T.slowReads = 0, R;
}