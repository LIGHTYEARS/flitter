// Module: add-hr-times
// Original: peR
// Type: CJS (RT wrapper)
// Exports: addHrTimes, getTimeOrigin, hrTime, hrTimeDuration, hrTimeToMicroseconds, hrTimeToMilliseconds, hrTimeToNanoseconds, hrTimeToTimeStamp, isTimeInput, isTimeInputHrTime, millisToHrTime, timeInputToHrTime
// Category: util

// Module: peR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.addHrTimes =
      T.isTimeInput =
      T.isTimeInputHrTime =
      T.hrTimeToMicroseconds =
      T.hrTimeToMilliseconds =
      T.hrTimeToNanoseconds =
      T.hrTimeToTimeStamp =
      T.hrTimeDuration =
      T.timeInputToHrTime =
      T.hrTime =
      T.getTimeOrigin =
      T.millisToHrTime =
        void 0));
  var R = D$T(),
    a = 9,
    e = 6,
    t = Math.pow(10, e),
    r = Math.pow(10, a);
  function h(y) {
    let u = y / 1000,
      P = Math.trunc(u),
      k = Math.round((y % 1000) * t);
    return [P, k];
  }
  T.millisToHrTime = h;
  function i() {
    let y = R.otperformance.timeOrigin;
    if (typeof y !== "number") {
      let u = R.otperformance;
      y = u.timing && u.timing.fetchStart;
    }
    return y;
  }
  T.getTimeOrigin = i;
  function c(y) {
    let u = h(i()),
      P = h(typeof y === "number" ? y : R.otperformance.now());
    return b(u, P);
  }
  T.hrTime = c;
  function s(y) {
    if (_(y)) return y;
    else if (typeof y === "number")
      if (y < i()) return c(y);
      else return h(y);
    else if (y instanceof Date) return h(y.getTime());
    else throw TypeError("Invalid input type");
  }
  T.timeInputToHrTime = s;
  function A(y, u) {
    let P = u[0] - y[0],
      k = u[1] - y[1];
    if (k < 0) ((P -= 1), (k += r));
    return [P, k];
  }
  T.hrTimeDuration = A;
  function l(y) {
    let u = a,
      P = `${"0".repeat(u)}${y[1]}Z`,
      k = P.substring(P.length - u - 1);
    return new Date(y[0] * 1000).toISOString().replace("000Z", k);
  }
  T.hrTimeToTimeStamp = l;
  function o(y) {
    return y[0] * r + y[1];
  }
  T.hrTimeToNanoseconds = o;
  function n(y) {
    return y[0] * 1000 + y[1] / 1e6;
  }
  T.hrTimeToMilliseconds = n;
  function p(y) {
    return y[0] * 1e6 + y[1] / 1000;
  }
  T.hrTimeToMicroseconds = p;
  function _(y) {
    return (
      Array.isArray(y) &&
      y.length === 2 &&
      typeof y[0] === "number" &&
      typeof y[1] === "number"
    );
  }
  T.isTimeInputHrTime = _;
  function m(y) {
    return _(y) || typeof y === "number" || y instanceof Date;
  }
  T.isTimeInput = m;
  function b(y, u) {
    let P = [y[0] + u[0], y[1] + u[1]];
    if (P[1] >= r) ((P[1] -= r), (P[0] += 1));
    return P;
  }
  T.addHrTimes = b;
};
