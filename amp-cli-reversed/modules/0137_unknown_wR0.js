function lR0(T) {
  return {
    body: oR0(T)
  };
}
function AR0(T, R) {
  nR0(T, R.body);
}
function pR0(T) {
  let R = new A0(new Uint8Array(Uk.initialBufferLength), Uk);
  return AR0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function _R0(T) {
  let R = new A0(T, Uk),
    a = lR0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Xx(T, R) {
  let a = new Uint8Array(T.length + R.length);
  return a.set(T, 0), a.set(R, T.length), a;
}
function Wi(T) {
  let R = new Uint8Array(pA.KV.length + T.length);
  return R.set(pA.KV, 0), R.set(T, pA.KV.length), R;
}
function SyT(T) {
  return T.slice(pA.KV.length);
}
function qi(T, R) {
  if (T instanceof Uint8Array) return T;
  if ((R ?? "text") === "binary") throw TypeError("Expected a Uint8Array when keyType is binary");
  return m2T.encode(T);
}
function OyT(T, R) {
  switch (R ?? "text") {
    case "text":
      return u2T.decode(T);
    case "binary":
      return T;
    default:
      throw TypeError("Invalid kv key type");
  }
}
function wR0(T) {
  if (typeof T === "string") return "text";
  if (T instanceof Uint8Array) return "binary";
  if (T instanceof ArrayBuffer) return "arrayBuffer";
  throw TypeError("Invalid kv value");
}