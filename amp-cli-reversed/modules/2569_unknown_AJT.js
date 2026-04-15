function TL0(T) {
  return new this(T).cos();
}
function RL0(T) {
  return new this(T).cosh();
}
function AJT(T) {
  var R, a, e;
  function t(r) {
    var h,
      i,
      c,
      s = this;
    if (!(s instanceof t)) return new t(r);
    if (s.constructor = t, DIT(r)) {
      if (s.s = r.s, g9) {
        if (!r.d || r.e > t.maxE) s.e = NaN, s.d = null;else if (r.e < t.minE) s.e = 0, s.d = [0];else s.e = r.e, s.d = r.d.slice();
      } else s.e = r.e, s.d = r.d ? r.d.slice() : r.d;
      return;
    }
    if (c = typeof r, c === "number") {
      if (r === 0) {
        s.s = 1 / r < 0 ? -1 : 1, s.e = 0, s.d = [0];
        return;
      }
      if (r < 0) r = -r, s.s = -1;else s.s = 1;
      if (r === ~~r && r < 1e7) {
        for (h = 0, i = r; i >= 10; i /= 10) h++;
        if (g9) {
          if (h > t.maxE) s.e = NaN, s.d = null;else if (h < t.minE) s.e = 0, s.d = [0];else s.e = h, s.d = [r];
        } else s.e = h, s.d = [r];
        return;
      }
      if (r * 0 !== 0) {
        if (!r) s.s = NaN;
        s.e = NaN, s.d = null;
        return;
      }
      return VM(s, r.toString());
    }
    if (c === "string") {
      if ((i = r.charCodeAt(0)) === 45) r = r.slice(1), s.s = -1;else {
        if (i === 43) r = r.slice(1);
        s.s = 1;
      }
      return iJT.test(r) ? VM(s, r) : N40(s, r);
    }
    if (c === "bigint") {
      if (r < 0) r = -r, s.s = -1;else s.s = 1;
      return VM(s, r.toString());
    }
    throw Error(DA + r);
  }
  if (t.prototype = WR, t.ROUND_UP = 0, t.ROUND_DOWN = 1, t.ROUND_CEIL = 2, t.ROUND_FLOOR = 3, t.ROUND_HALF_UP = 4, t.ROUND_HALF_DOWN = 5, t.ROUND_HALF_EVEN = 6, t.ROUND_HALF_CEIL = 7, t.ROUND_HALF_FLOOR = 8, t.EUCLID = 9, t.config = t.set = J40, t.clone = AJT, t.isDecimal = DIT, t.abs = H40, t.acos = W40, t.acosh = q40, t.add = z40, t.asin = F40, t.asinh = G40, t.atan = K40, t.atanh = V40, t.atan2 = X40, t.cbrt = Y40, t.ceil = Q40, t.clamp = Z40, t.cos = TL0, t.cosh = RL0, t.div = aL0, t.exp = eL0, t.floor = tL0, t.hypot = rL0, t.ln = hL0, t.log = iL0, t.log10 = sL0, t.log2 = cL0, t.max = oL0, t.min = nL0, t.mod = lL0, t.mul = AL0, t.pow = pL0, t.random = _L0, t.round = bL0, t.sign = mL0, t.sin = uL0, t.sinh = yL0, t.sqrt = PL0, t.sub = kL0, t.sum = xL0, t.tan = fL0, t.tanh = IL0, t.trunc = gL0, T === void 0) T = {};
  if (T) {
    if (T.defaults !== !0) {
      e = ["precision", "rounding", "toExpNeg", "toExpPos", "maxE", "minE", "modulo", "crypto"];
      for (R = 0; R < e.length;) if (!T.hasOwnProperty(a = e[R++])) T[a] = this[a];
    }
  }
  return t.config(T), t;
}