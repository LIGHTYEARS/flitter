function YpR() {
  this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
}
function Ug(T) {
  this.options = N$.assign({
    chunkSize: 65536,
    windowBits: 15,
    to: ""
  }, T || {});
  let R = this.options;
  if (R.raw && R.windowBits >= 0 && R.windowBits < 16) {
    if (R.windowBits = -R.windowBits, R.windowBits === 0) R.windowBits = -15;
  }
  if (R.windowBits >= 0 && R.windowBits < 16 && !(T && T.windowBits)) R.windowBits += 32;
  if (R.windowBits > 15 && R.windowBits < 48) {
    if ((R.windowBits & 15) === 0) R.windowBits |= 15;
  }
  this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l9T(), this.strm.avail_out = 0;
  let a = ns.inflateInit2(this.strm, R.windowBits);
  if (a !== Yy) throw Error(xA[a]);
  if (this.header = new nLT(), ns.inflateGetHeader(this.strm, this.header), R.dictionary) {
    if (typeof R.dictionary === "string") R.dictionary = Xy.string2buf(R.dictionary);else if (V2.call(R.dictionary) === "[object ArrayBuffer]") R.dictionary = new Uint8Array(R.dictionary);
    if (R.raw) {
      if (a = ns.inflateSetDictionary(this.strm, R.dictionary), a !== Yy) throw Error(xA[a]);
    }
  }
}