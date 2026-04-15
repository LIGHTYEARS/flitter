function j5T(T, R = !1) {
  let a = T.length,
    e = 0,
    t = "",
    r = 0,
    h = 16,
    i = 0,
    c = 0,
    s = 0,
    A = 0,
    l = 0;
  function o(u, P) {
    let k = 0,
      x = 0;
    while (k < u || !P) {
      let f = T.charCodeAt(e);
      if (f >= 48 && f <= 57) x = x * 16 + f - 48;else if (f >= 65 && f <= 70) x = x * 16 + f - 65 + 10;else if (f >= 97 && f <= 102) x = x * 16 + f - 97 + 10;else break;
      e++, k++;
    }
    if (k < u) x = -1;
    return x;
  }
  function n(u) {
    e = u, t = "", r = 0, h = 16, l = 0;
  }
  function p() {
    let u = e;
    if (T.charCodeAt(e) === 48) e++;else {
      e++;
      while (e < T.length && Gu(T.charCodeAt(e))) e++;
    }
    if (e < T.length && T.charCodeAt(e) === 46) if (e++, e < T.length && Gu(T.charCodeAt(e))) {
      e++;
      while (e < T.length && Gu(T.charCodeAt(e))) e++;
    } else return l = 3, T.substring(u, e);
    let P = e;
    if (e < T.length && (T.charCodeAt(e) === 69 || T.charCodeAt(e) === 101)) {
      if (e++, e < T.length && T.charCodeAt(e) === 43 || T.charCodeAt(e) === 45) e++;
      if (e < T.length && Gu(T.charCodeAt(e))) {
        e++;
        while (e < T.length && Gu(T.charCodeAt(e))) e++;
        P = e;
      } else l = 3;
    }
    return T.substring(u, P);
  }
  function _() {
    let u = "",
      P = e;
    while (!0) {
      if (e >= a) {
        u += T.substring(P, e), l = 2;
        break;
      }
      let k = T.charCodeAt(e);
      if (k === 34) {
        u += T.substring(P, e), e++;
        break;
      }
      if (k === 92) {
        if (u += T.substring(P, e), e++, e >= a) {
          l = 2;
          break;
        }
        switch (T.charCodeAt(e++)) {
          case 34:
            u += '"';
            break;
          case 92:
            u += "\\";
            break;
          case 47:
            u += "/";
            break;
          case 98:
            u += "\b";
            break;
          case 102:
            u += "\f";
            break;
          case 110:
            u += `
`;
            break;
          case 114:
            u += "\r";
            break;
          case 116:
            u += "\t";
            break;
          case 117:
            let x = o(4, !0);
            if (x >= 0) u += String.fromCharCode(x);else l = 4;
            break;
          default:
            l = 5;
        }
        P = e;
        continue;
      }
      if (k >= 0 && k <= 31) if (UI(k)) {
        u += T.substring(P, e), l = 2;
        break;
      } else l = 6;
      e++;
    }
    return u;
  }
  function m() {
    if (t = "", l = 0, r = e, c = i, A = s, e >= a) return r = a, h = 17;
    let u = T.charCodeAt(e);
    if (rz(u)) {
      do e++, t += String.fromCharCode(u), u = T.charCodeAt(e); while (rz(u));
      return h = 15;
    }
    if (UI(u)) {
      if (e++, t += String.fromCharCode(u), u === 13 && T.charCodeAt(e) === 10) e++, t += `
`;
      return i++, s = e, h = 14;
    }
    switch (u) {
      case 123:
        return e++, h = 1;
      case 125:
        return e++, h = 2;
      case 91:
        return e++, h = 3;
      case 93:
        return e++, h = 4;
      case 58:
        return e++, h = 6;
      case 44:
        return e++, h = 5;
      case 34:
        return e++, t = _(), h = 10;
      case 47:
        let P = e - 1;
        if (T.charCodeAt(e + 1) === 47) {
          e += 2;
          while (e < a) {
            if (UI(T.charCodeAt(e))) break;
            e++;
          }
          return t = T.substring(P, e), h = 12;
        }
        if (T.charCodeAt(e + 1) === 42) {
          e += 2;
          let k = a - 1,
            x = !1;
          while (e < k) {
            let f = T.charCodeAt(e);
            if (f === 42 && T.charCodeAt(e + 1) === 47) {
              e += 2, x = !0;
              break;
            }
            if (e++, UI(f)) {
              if (f === 13 && T.charCodeAt(e) === 10) e++;
              i++, s = e;
            }
          }
          if (!x) e++, l = 1;
          return t = T.substring(P, e), h = 13;
        }
        return t += String.fromCharCode(u), e++, h = 16;
      case 45:
        if (t += String.fromCharCode(u), e++, e === a || !Gu(T.charCodeAt(e))) return h = 16;
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
        return t += p(), h = 11;
      default:
        while (e < a && b(u)) e++, u = T.charCodeAt(e);
        if (r !== e) {
          switch (t = T.substring(r, e), t) {
            case "true":
              return h = 8;
            case "false":
              return h = 9;
            case "null":
              return h = 7;
          }
          return h = 16;
        }
        return t += String.fromCharCode(u), e++, h = 16;
    }
  }
  function b(u) {
    if (rz(u) || UI(u)) return !1;
    switch (u) {
      case 125:
      case 93:
      case 123:
      case 91:
      case 34:
      case 58:
      case 44:
      case 47:
        return !1;
    }
    return !0;
  }
  function y() {
    let u;
    do u = m(); while (u >= 12 && u <= 15);
    return u;
  }
  return {
    setPosition: n,
    getPosition: () => e,
    scan: R ? y : m,
    getToken: () => h,
    getTokenValue: () => t,
    getTokenOffset: () => r,
    getTokenLength: () => e - r,
    getTokenStartLine: () => c,
    getTokenStartCharacter: () => r - A,
    getTokenError: () => l
  };
}