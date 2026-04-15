function CbT(T) {
  return TypeError(`ReadableStreamAsyncIterator.${T} can only be used on a ReadableSteamAsyncIterator`);
}
function JUT(T, R, a, e, t) {
  new Uint8Array(T).set(new Uint8Array(a, e, t), R);
}
function LbT(T) {
  let R = function (a, e, t) {
    if (a.slice) return a.slice(e, t);
    let r = t - e,
      h = new ArrayBuffer(r);
    return JUT(h, 0, a, e, r), h;
  }(T.buffer, T.byteOffset, T.byteOffset + T.byteLength);
  return new Uint8Array(R);
}