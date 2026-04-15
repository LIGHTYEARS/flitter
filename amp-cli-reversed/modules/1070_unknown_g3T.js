function OO(T, R) {
  let a = T instanceof Date ? T.getTime() : T;
  return g3T(Date.now() - a, R);
}
function g3T(T, {
  approximate: R,
  verbose: a,
  future: e
} = {}) {
  if (e) T *= -1;
  if (R && T < 60000) return a ? "less than 1 minute" : "<1m";
  let t = Math.floor(T / 1000),
    r = Math.floor(t / 60),
    h = Math.floor(r / 60),
    i = Math.floor(h / 24),
    c = Math.floor(i / 30),
    s = [{
      value: Math.floor(c / 12),
      short: "y",
      long: "year"
    }, {
      value: c,
      short: "mo",
      long: "month"
    }, {
      value: i,
      short: "d",
      long: "day"
    }, {
      value: h,
      short: "h",
      long: "hour"
    }, {
      value: r,
      short: "m",
      long: "minute"
    }, {
      value: t,
      short: "s",
      long: "second"
    }];
  for (let A of s) if (A.value > 0) {
    if (a) return `${A.value} ${o9(A.value, A.long)}`;
    return `${A.value}${A.short}`;
  }
  return a ? "0 seconds" : "0s";
}