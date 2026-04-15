function DIT(T) {
  return T instanceof ZH || T && T.toStringTag === hJT || !1;
}
function hL0(T) {
  return new this(T).ln();
}
function iL0(T, R) {
  return new this(T).log(R);
}
function cL0(T) {
  return new this(T).log(2);
}
function sL0(T) {
  return new this(T).log(10);
}
function oL0() {
  return oJT(this, arguments, -1);
}
function nL0() {
  return oJT(this, arguments, 1);
}
function lL0(T, R) {
  return new this(T).mod(R);
}
function AL0(T, R) {
  return new this(T).mul(R);
}
function pL0(T, R) {
  return new this(T).pow(R);
}
function _L0(T) {
  var R,
    a,
    e,
    t,
    r = 0,
    h = new this(1),
    i = [];
  if (T === void 0) T = this.precision;else wr(T, 1, up);
  if (e = Math.ceil(T / s9), !this.crypto) for (; r < e;) i[r++] = Math.random() * 1e7 | 0;else if (crypto.getRandomValues) {
    R = crypto.getRandomValues(new Uint32Array(e));
    for (; r < e;) if (t = R[r], t >= 4290000000) R[r] = crypto.getRandomValues(new Uint32Array(1))[0];else i[r++] = t % 1e7;
  } else if (crypto.randomBytes) {
    R = crypto.randomBytes(e *= 4);
    for (; r < e;) if (t = R[r] + (R[r + 1] << 8) + (R[r + 2] << 16) + ((R[r + 3] & 127) << 24), t >= 2140000000) crypto.randomBytes(4).copy(R, r);else i.push(t % 1e7), r += 4;
    r = e / 4;
  } else throw Error(rJT);
  if (e = i[--r], T %= s9, e && T) t = Ka(10, s9 - T), i[r] = (e / t | 0) * t;
  for (; i[r] === 0; r--) i.pop();
  if (r < 0) a = 0, i = [0];else {
    a = -1;
    for (; i[0] === 0; a -= s9) i.shift();
    for (e = 1, t = i[0]; t >= 10; t /= 10) e++;
    if (e < s9) a -= s9 - e;
  }
  return h.e = a, h.d = i, h;
}