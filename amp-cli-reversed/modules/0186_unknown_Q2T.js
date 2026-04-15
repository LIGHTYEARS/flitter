function C90(T) {
  return Y2T(T).buffer;
}
function Q2T(T) {
  return JSON.stringify(T, (R, a) => {
    if (typeof a === "bigint") return ["$BigInt", a.toString()];else if (a instanceof ArrayBuffer) return ["$ArrayBuffer", E90(a)];else if (a instanceof Uint8Array) return ["$Uint8Array", X2T(a)];
    if (Array.isArray(a) && a.length === 2 && typeof a[0] === "string" && a[0].startsWith("$")) return ["$" + a[0], a[1]];
    return a;
  });
}