function h9T(T, R) {
  let a = new Ng(R);
  if (a.push(T, !0), a.err) throw a.msg || xA[a.err];
  return a.result;
}
function KpR(T, R) {
  return R = R || {}, R.raw = !0, h9T(T, R);
}
function VpR(T, R) {
  return R = R || {}, R.gzip = !0, h9T(T, R);
}
function XpR() {
  this.strm = null, this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new Uint16Array(320), this.work = new Uint16Array(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
}