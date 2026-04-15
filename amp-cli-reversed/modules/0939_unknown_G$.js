function I6T(T) {
  return T.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
function _dR(T) {
  let R = 0;
  for (let t of T) R += t.length;
  let a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a;
}
function G8T(T) {
  let R;
  return (yC !== null && yC !== void 0 ? yC : (R = new globalThis.TextEncoder(), yC = R.encode.bind(R)))(T);
}
function RpT(T) {
  let R;
  return (PC !== null && PC !== void 0 ? PC : (R = new globalThis.TextDecoder(), PC = R.decode.bind(R)))(T);
}
class G$ {
  constructor() {
    this.buffer = new Uint8Array(), this.carriageReturnIndex = null;
  }
  decode(T) {
    if (T == null) return [];
    let R = T instanceof ArrayBuffer ? new Uint8Array(T) : typeof T === "string" ? G8T(T) : T;
    this.buffer = _dR([this.buffer, R]);
    let a = [],
      e;
    while ((e = bdR(this.buffer, this.carriageReturnIndex)) != null) {
      if (e.carriage && this.carriageReturnIndex == null) {
        this.carriageReturnIndex = e.index;
        continue;
      }
      if (this.carriageReturnIndex != null && (e.index !== this.carriageReturnIndex + 1 || e.carriage)) {
        a.push(RpT(this.buffer.subarray(0, this.carriageReturnIndex - 1))), this.buffer = this.buffer.subarray(this.carriageReturnIndex), this.carriageReturnIndex = null;
        continue;
      }
      let t = this.carriageReturnIndex !== null ? e.preceding - 1 : e.preceding,
        r = RpT(this.buffer.subarray(0, t));
      a.push(r), this.buffer = this.buffer.subarray(e.index), this.carriageReturnIndex = null;
    }
    return a;
  }
  flush() {
    if (!this.buffer.length) return [];
    return this.decode(`
`);
  }
}