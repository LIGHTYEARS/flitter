function iVR(T) {
  let R = T.reduce((t, r) => t + r.length, 0),
    a = new Uint8Array(R),
    e = 0;
  for (let t of T) a.set(t, e), e += t.length;
  return a;
}
class eFT {
  constructor(T) {
    this.tokenizer = T;
  }
  inflate() {
    let T = this.tokenizer;
    return new ReadableStream({
      async pull(R) {
        let a = new Uint8Array(1024),
          e = await T.readBuffer(a, {
            mayBeLess: !0
          });
        if (e === 0) {
          R.close();
          return;
        }
        R.enqueue(a.subarray(0, e));
      }
    }).pipeThrough(new DecompressionStream("gzip"));
  }
}