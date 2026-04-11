// Module: float-2
// Original: HPR
// Type: CJS (RT wrapper)
// Exports: float, floatExp, floatNaN
// Category: util

// Module: HPR (CJS)
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
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (h) => parseFloat(h.replace(/_/g, "")),
      stringify(h) {
        let i = Number(h.value);
        return isFinite(i) ? i.toExponential() : a.stringifyNumber(h);
      },
    },
    r = {
      identify: (h) => typeof h === "number",
      default: !0,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(h) {
        let i = new R.Scalar(parseFloat(h.replace(/_/g, ""))),
          c = h.indexOf(".");
        if (c !== -1) {
          let s = h.substring(c + 1).replace(/_/g, "");
          if (s[s.length - 1] === "0") i.minFractionDigits = s.length;
        }
        return i;
      },
      stringify: a.stringifyNumber,
    };
  ((T.float = r), (T.floatExp = t), (T.floatNaN = e));
};
