// Module: ms
// Original: nZ
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: npm-pkg

// Module: nZ (CJS)
(T, R) => {
  var a = 1000,
    e = a * 60,
    t = e * 60,
    r = t * 24,
    h = r * 7,
    i = r * 365.25;
  R.exports = function (o, n) {
    n = n || {};
    var p = typeof o;
    if (p === "string" && o.length > 0) return c(o);
    else if (p === "number" && isFinite(o)) return n.long ? A(o) : s(o);
    throw Error(
      "val is not a non-empty string or a valid number. val=" +
        JSON.stringify(o),
    );
  };
  function c(o) {
    if (((o = String(o)), o.length > 100)) return;
    var n =
      /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        o,
      );
    if (!n) return;
    var p = parseFloat(n[1]),
      _ = (n[2] || "ms").toLowerCase();
    switch (_) {
      case "years":
      case "year":
      case "yrs":
      case "yr":
      case "y":
        return p * i;
      case "weeks":
      case "week":
      case "w":
        return p * h;
      case "days":
      case "day":
      case "d":
        return p * r;
      case "hours":
      case "hour":
      case "hrs":
      case "hr":
      case "h":
        return p * t;
      case "minutes":
      case "minute":
      case "mins":
      case "min":
      case "m":
        return p * e;
      case "seconds":
      case "second":
      case "secs":
      case "sec":
      case "s":
        return p * a;
      case "milliseconds":
      case "millisecond":
      case "msecs":
      case "msec":
      case "ms":
        return p;
      default:
        return;
    }
  }
  function s(o) {
    var n = Math.abs(o);
    if (n >= r) return Math.round(o / r) + "d";
    if (n >= t) return Math.round(o / t) + "h";
    if (n >= e) return Math.round(o / e) + "m";
    if (n >= a) return Math.round(o / a) + "s";
    return o + "ms";
  }
  function A(o) {
    var n = Math.abs(o);
    if (n >= r) return l(o, n, r, "day");
    if (n >= t) return l(o, n, t, "hour");
    if (n >= e) return l(o, n, e, "minute");
    if (n >= a) return l(o, n, a, "second");
    return o + " ms";
  }
  function l(o, n, p, _) {
    var m = n >= p * 1.5;
    return Math.round(o / p) + " " + _ + (m ? "s" : "");
  }
};
