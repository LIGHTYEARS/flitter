function S5T(T, R, a = Qj.DEFAULT) {
  let e = j5T(T, !1),
    t = [],
    r = 0;
  function h(d) {
    return d ? () => r === 0 && d(e.getTokenOffset(), e.getTokenLength(), e.getTokenStartLine(), e.getTokenStartCharacter()) : () => !0;
  }
  function i(d) {
    return d ? C => r === 0 && d(C, e.getTokenOffset(), e.getTokenLength(), e.getTokenStartLine(), e.getTokenStartCharacter()) : () => !0;
  }
  function c(d) {
    return d ? C => r === 0 && d(C, e.getTokenOffset(), e.getTokenLength(), e.getTokenStartLine(), e.getTokenStartCharacter(), () => t.slice()) : () => !0;
  }
  function s(d) {
    return d ? () => {
      if (r > 0) r++;else if (d(e.getTokenOffset(), e.getTokenLength(), e.getTokenStartLine(), e.getTokenStartCharacter(), () => t.slice()) === !1) r = 1;
    } : () => !0;
  }
  function A(d) {
    return d ? () => {
      if (r > 0) r--;
      if (r === 0) d(e.getTokenOffset(), e.getTokenLength(), e.getTokenStartLine(), e.getTokenStartCharacter());
    } : () => !0;
  }
  let l = s(R.onObjectBegin),
    o = c(R.onObjectProperty),
    n = A(R.onObjectEnd),
    p = s(R.onArrayBegin),
    _ = A(R.onArrayEnd),
    m = c(R.onLiteralValue),
    b = i(R.onSeparator),
    y = h(R.onComment),
    u = i(R.onError),
    P = a && a.disallowComments,
    k = a && a.allowTrailingComma;
  function x() {
    while (!0) {
      let d = e.scan();
      switch (e.getTokenError()) {
        case 4:
          f(14);
          break;
        case 5:
          f(15);
          break;
        case 3:
          f(13);
          break;
        case 1:
          if (!P) f(11);
          break;
        case 2:
          f(12);
          break;
        case 6:
          f(16);
          break;
      }
      switch (d) {
        case 12:
        case 13:
          if (P) f(10);else y();
          break;
        case 16:
          f(1);
          break;
        case 15:
        case 14:
          break;
        default:
          return d;
      }
    }
  }
  function f(d, C = [], L = []) {
    if (u(d), C.length + L.length > 0) {
      let w = e.getToken();
      while (w !== 17) {
        if (C.indexOf(w) !== -1) {
          x();
          break;
        } else if (L.indexOf(w) !== -1) break;
        w = x();
      }
    }
  }
  function v(d) {
    let C = e.getTokenValue();
    if (d) m(C);else o(C), t.push(C);
    return x(), !0;
  }
  function g() {
    switch (e.getToken()) {
      case 11:
        let d = e.getTokenValue(),
          C = Number(d);
        if (isNaN(C)) f(2), C = 0;
        m(C);
        break;
      case 7:
        m(null);
        break;
      case 8:
        m(!0);
        break;
      case 9:
        m(!1);
        break;
      default:
        return !1;
    }
    return x(), !0;
  }
  function I() {
    if (e.getToken() !== 10) return f(3, [], [2, 5]), !1;
    if (v(!1), e.getToken() === 6) {
      if (b(":"), x(), !j()) f(4, [], [2, 5]);
    } else f(5, [], [2, 5]);
    return t.pop(), !0;
  }
  function S() {
    l(), x();
    let d = !1;
    while (e.getToken() !== 2 && e.getToken() !== 17) {
      if (e.getToken() === 5) {
        if (!d) f(4, [], []);
        if (b(","), x(), e.getToken() === 2 && k) break;
      } else if (d) f(6, [], []);
      if (!I()) f(4, [], [2, 5]);
      d = !0;
    }
    if (n(), e.getToken() !== 2) f(7, [2], []);else x();
    return !0;
  }
  function O() {
    p(), x();
    let d = !0,
      C = !1;
    while (e.getToken() !== 4 && e.getToken() !== 17) {
      if (e.getToken() === 5) {
        if (!C) f(4, [], []);
        if (b(","), x(), e.getToken() === 4 && k) break;
      } else if (C) f(6, [], []);
      if (d) t.push(0), d = !1;else t[t.length - 1]++;
      if (!j()) f(4, [], [4, 5]);
      C = !0;
    }
    if (_(), !d) t.pop();
    if (e.getToken() !== 4) f(8, [4], []);else x();
    return !0;
  }
  function j() {
    switch (e.getToken()) {
      case 3:
        return O();
      case 1:
        return S();
      case 10:
        return v(!0);
      default:
        return g();
    }
  }
  if (x(), e.getToken() === 17) {
    if (a.allowEmptyContent) return !0;
    return f(4, [], []), !1;
  }
  if (!j()) return f(4, [], []), !1;
  if (e.getToken() !== 17) f(9, [], []);
  return !0;
}