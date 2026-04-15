function Ng(T) {
  this.options = N$.assign({
    level: z4T,
    method: G4T,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: F4T
  }, T || {});
  let R = this.options;
  if (R.raw && R.windowBits > 0) R.windowBits = -R.windowBits;else if (R.gzip && R.windowBits > 0 && R.windowBits < 16) R.windowBits += 16;
  this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new l9T(), this.strm.avail_out = 0;
  let a = IP.deflateInit2(this.strm, R.level, R.method, R.windowBits, R.memLevel, R.strategy);
  if (a !== U$) throw Error(xA[a]);
  if (R.header) IP.deflateSetHeader(this.strm, R.header);
  if (R.dictionary) {
    let e;
    if (typeof R.dictionary === "string") e = Xy.string2buf(R.dictionary);else if (F2.call(R.dictionary) === "[object ArrayBuffer]") e = new Uint8Array(R.dictionary);else e = R.dictionary;
    if (a = IP.deflateSetDictionary(this.strm, e), a !== U$) throw Error(xA[a]);
    this._dict_set = !0;
  }
}