function Aj0(T) {
  let R = T;
  return zH(a);
  function a(e) {
    let t = e,
      r;
    for (r in T) if (t[r] !== R[r]) return !1;
    return !0;
  }
}
function pj0(T) {
  return zH(R);
  function R(a) {
    return a && a.type === T;
  }
}
function zH(T) {
  return R;
  function R(a, e, t) {
    return Boolean(bj0(a) && T.call(this, a, typeof e === "number" ? e : void 0, t || void 0));
  }
}
function _j0() {
  return !0;
}
function bj0(T) {
  return T !== null && typeof T === "object" && "type" in T;
}
function mj0(T) {
  return "\x1B[33m" + T + "\x1B[39m";
}
function cQT(T, R, a, e) {
  let t;
  if (typeof R === "function" && typeof a !== "function") e = a, a = R;else t = R;
  let r = qH(t),
    h = e ? -1 : 1;
  i(T, void 0, [])();
  function i(c, s, A) {
    let l = c && typeof c === "object" ? c : {};
    if (typeof l.type === "string") {
      let n = typeof l.tagName === "string" ? l.tagName : typeof l.name === "string" ? l.name : void 0;
      Object.defineProperty(o, "name", {
        value: "node (" + mj0(c.type + (n ? "<" + n + ">" : "")) + ")"
      });
    }
    return o;
    function o() {
      let n = iQT,
        p,
        _,
        m;
      if (!R || r(c, s, A[A.length - 1] || void 0)) {
        if (n = Pj0(a(c, A)), n[0] === YY) return n;
      }
      if ("children" in c && c.children) {
        let b = c;
        if (b.children && n[0] !== yj0) {
          _ = (e ? b.children.length : -1) + h, m = A.concat(b);
          while (_ > -1 && _ < b.children.length) {
            let y = b.children[_];
            if (p = i(y, _, m)(), p[0] === YY) return p;
            _ = typeof p[1] === "number" ? p[1] : _ + h;
          }
        }
      }
      return n;
    }
  }
}