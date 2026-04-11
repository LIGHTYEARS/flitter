// Module: float
// Original: CDT
// Type: CJS (RT wrapper)
// Exports: float, floatExp, floatNaN
// Category: util

// Module: CDT (CJS)
(T) => {
  var R = Qa(),
    a = AO(),
    e = {
      identify: (h) => typeof h === "number",
      default: !0,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (h) =>
        h.slice(-3).toLowerCase() === "nan"
          ? NaN
          : h[0] === "-"
            ? Number.NEGATIVE_INFINITY
            : Number.POSITIVE_INFINITY,
      stringify: a.stringifyNumber,
    },
    t = {
      identify: (h) => typeof h === "number",
      default: !0,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (h) => parseFloat(h),
      stringify(h) {
        let i = Number(h.value);
        return isFinite(i) ? i.toExponential() : a.stringifyNumber(h);
      },
    },
    r = {
      identify: (h) => typeof h === "number",
      default: !0,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(h) {
        let i = new R.Scalar(parseFloat(h)),
          c = h.indexOf(".");
        if (c !== -1 && h[h.length - 1] === "0")
          i.minFractionDigits = h.length - c - 1;
        return i;
      },
      stringify: a.stringifyNumber,
    };
  ((T.float = r), (T.floatExp = t), (T.floatNaN = e));
};
