function S9(T) {
  return this instanceof S9 ? (this.v = T, this) : new S9(T);
}
function ac(T, R, a) {
  if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
  var e = a.apply(T, R || []),
    t,
    r = [];
  return t = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), i("next"), i("throw"), i("return", h), t[Symbol.asyncIterator] = function () {
    return this;
  }, t;
  function h(n) {
    return function (p) {
      return Promise.resolve(p).then(n, l);
    };
  }
  function i(n, p) {
    if (e[n]) {
      if (t[n] = function (_) {
        return new Promise(function (m, b) {
          r.push([n, _, m, b]) > 1 || c(n, _);
        });
      }, p) t[n] = p(t[n]);
    }
  }
  function c(n, p) {
    try {
      s(e[n](p));
    } catch (_) {
      o(r[0][3], _);
    }
  }
  function s(n) {
    n.value instanceof S9 ? Promise.resolve(n.value.v).then(A, l) : o(r[0][2], n);
  }
  function A(n) {
    c("next", n);
  }
  function l(n) {
    c("throw", n);
  }
  function o(n, p) {
    if (n(p), r.shift(), r.length) c(r[0][0], r[0][1]);
  }
}