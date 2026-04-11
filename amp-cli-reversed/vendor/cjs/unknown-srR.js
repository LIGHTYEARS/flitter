// Module: unknown-srR
// Original: srR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: srR (CJS)
(T, R) => {
  R.exports = t;
  var a = fZ();
  (t.prototype = Object.create(a.prototype)).constructor = t;
  var e = $n();
  function t(r) {
    a.call(this, r);
  }
  ((t._configure = function () {
    if (e.Buffer) t.prototype._slice = e.Buffer.prototype.slice;
  }),
    (t.prototype.string = function () {
      var r = this.uint32();
      return this.buf.utf8Slice
        ? this.buf.utf8Slice(
            this.pos,
            (this.pos = Math.min(this.pos + r, this.len)),
          )
        : this.buf.toString(
            "utf-8",
            this.pos,
            (this.pos = Math.min(this.pos + r, this.len)),
          );
    }),
    t._configure());
};
