function Vt0(T) {
  if (T instanceof Blob) return T.size;
  if (T instanceof ArrayBuffer) return T.byteLength;
  if (T instanceof Uint8Array) return T.byteLength;
  if (typeof T === "string") return T.length;
  FO(T);
}