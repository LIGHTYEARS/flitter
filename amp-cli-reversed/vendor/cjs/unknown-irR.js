// Module: unknown-irR
// Original: irR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: irR (CJS)
(T, R) => {
  R.exports = e;
  var a = $n();
  function e(i, c) {
    ((this.lo = i >>> 0), (this.hi = c >>> 0));
  }
  var t = (e.zero = new e(0, 0));
  ((t.toNumber = function () {
    return 0;
  }),
    (t.zzEncode = t.zzDecode =
      function () {
        return this;
      }),
    (t.length = function () {
      return 1;
    }));
  var r = (e.zeroHash = "\x00\x00\x00\x00\x00\x00\x00\x00");
  ((e.fromNumber = function (i) {
    if (i === 0) return t;
    var c = i < 0;
    if (c) i = -i;
    var s = i >>> 0,
      A = ((i - s) / 4294967296) >>> 0;
    if (c) {
      if (((A = ~A >>> 0), (s = ~s >>> 0), ++s > 4294967295)) {
        if (((s = 0), ++A > 4294967295)) A = 0;
      }
    }
    return new e(s, A);
  }),
    (e.from = function (i) {
      if (typeof i === "number") return e.fromNumber(i);
      if (a.isString(i))
        if (a.Long) i = a.Long.fromString(i);
        else return e.fromNumber(parseInt(i, 10));
      return i.low || i.high ? new e(i.low >>> 0, i.high >>> 0) : t;
    }),
    (e.prototype.toNumber = function (i) {
      if (!i && this.hi >>> 31) {
        var c = (~this.lo + 1) >>> 0,
          s = ~this.hi >>> 0;
        if (!c) s = (s + 1) >>> 0;
        return -(c + s * 4294967296);
      }
      return this.lo + this.hi * 4294967296;
    }),
    (e.prototype.toLong = function (i) {
      return a.Long
        ? new a.Long(this.lo | 0, this.hi | 0, Boolean(i))
        : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(i) };
    }));
  var h = String.prototype.charCodeAt;
  ((e.fromHash = function (i) {
    if (i === r) return t;
    return new e(
      (h.call(i, 0) |
        (h.call(i, 1) << 8) |
        (h.call(i, 2) << 16) |
        (h.call(i, 3) << 24)) >>>
        0,
      (h.call(i, 4) |
        (h.call(i, 5) << 8) |
        (h.call(i, 6) << 16) |
        (h.call(i, 7) << 24)) >>>
        0,
    );
  }),
    (e.prototype.toHash = function () {
      return String.fromCharCode(
        this.lo & 255,
        (this.lo >>> 8) & 255,
        (this.lo >>> 16) & 255,
        this.lo >>> 24,
        this.hi & 255,
        (this.hi >>> 8) & 255,
        (this.hi >>> 16) & 255,
        this.hi >>> 24,
      );
    }),
    (e.prototype.zzEncode = function () {
      var i = this.hi >> 31;
      return (
        (this.hi = (((this.hi << 1) | (this.lo >>> 31)) ^ i) >>> 0),
        (this.lo = ((this.lo << 1) ^ i) >>> 0),
        this
      );
    }),
    (e.prototype.zzDecode = function () {
      var i = -(this.lo & 1);
      return (
        (this.lo = (((this.lo >>> 1) | (this.hi << 31)) ^ i) >>> 0),
        (this.hi = ((this.hi >>> 1) ^ i) >>> 0),
        this
      );
    }),
    (e.prototype.length = function () {
      var i = this.lo,
        c = ((this.lo >>> 28) | (this.hi << 4)) >>> 0,
        s = this.hi >>> 24;
      return s === 0
        ? c === 0
          ? i < 16384
            ? i < 128
              ? 1
              : 2
            : i < 2097152
              ? 3
              : 4
          : c < 16384
            ? c < 128
              ? 5
              : 6
            : c < 2097152
              ? 7
              : 8
        : s < 128
          ? 9
          : 10;
    }));
};
