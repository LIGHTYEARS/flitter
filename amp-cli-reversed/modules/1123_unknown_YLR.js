function YLR(T, R) {
  return function (a) {
    try {
      return a.getReader({
        mode: "byob"
      }).releaseLock(), !0;
    } catch (e) {
      return !1;
    }
  }(T) ? function (a) {
    let e,
      t,
      r,
      h,
      i,
      c = a.getReader(),
      s = !1,
      A = !1,
      l = !1,
      o = !1,
      n = !1,
      p = !1,
      _ = zt(g => {
        i = g;
      });
    function m(g) {
      SbT(g.closed, I => (g !== c || (r.error(I), h.error(I), n && p || i(void 0)), null));
    }
    function b() {
      s && (c.releaseLock(), c = a.getReader(), m(c), s = !1), ot(c.read(), g => {
        var I, S;
        if (l = !1, o = !1, g.done) return n || r.close(), p || h.close(), (I = r.byobRequest) === null || I === void 0 || I.respond(0), (S = h.byobRequest) === null || S === void 0 || S.respond(0), n && p || i(void 0), null;
        let O = g.value,
          j = O,
          d = O;
        if (!n && !p) try {
          d = LbT(O);
        } catch (C) {
          return r.error(C), h.error(C), i(c.cancel(C)), null;
        }
        return n || r.enqueue(j), p || h.enqueue(d), A = !1, l ? u() : o && P(), null;
      }, () => (A = !1, null));
    }
    function y(g, I) {
      s || (c.releaseLock(), c = a.getReader({
        mode: "byob"
      }), m(c), s = !0);
      let S = I ? h : r,
        O = I ? r : h;
      ot(c.read(g), j => {
        var d;
        l = !1, o = !1;
        let C = I ? p : n,
          L = I ? n : p;
        if (j.done) {
          C || S.close(), L || O.close();
          let D = j.value;
          return D !== void 0 && (C || S.byobRequest.respondWithNewView(D), L || (d = O.byobRequest) === null || d === void 0 || d.respond(0)), C && L || i(void 0), null;
        }
        let w = j.value;
        if (L) C || S.byobRequest.respondWithNewView(w);else {
          let D;
          try {
            D = LbT(w);
          } catch (B) {
            return S.error(B), O.error(B), i(c.cancel(B)), null;
          }
          C || S.byobRequest.respondWithNewView(w), O.enqueue(D);
        }
        return A = !1, l ? u() : o && P(), null;
      }, () => (A = !1, null));
    }
    function u() {
      if (A) return l = !0, E8(void 0);
      A = !0;
      let g = r.byobRequest;
      return g === null ? b() : y(g.view, !1), E8(void 0);
    }
    function P() {
      if (A) return o = !0, E8(void 0);
      A = !0;
      let g = h.byobRequest;
      return g === null ? b() : y(g.view, !0), E8(void 0);
    }
    function k(g) {
      if (n = !0, e = g, p) {
        let I = [e, t],
          S = c.cancel(I);
        i(S);
      }
      return _;
    }
    function x(g) {
      if (p = !0, t = g, n) {
        let I = [e, t],
          S = c.cancel(I);
        i(S);
      }
      return _;
    }
    let f = new me({
        type: "bytes",
        start(g) {
          r = g;
        },
        pull: u,
        cancel: k
      }),
      v = new me({
        type: "bytes",
        start(g) {
          h = g;
        },
        pull: P,
        cancel: x
      });
    return m(c), [f, v];
  }(T) : function (a, e) {
    let t = a.getReader(),
      r,
      h,
      i,
      c,
      s,
      A = !1,
      l = !1,
      o = !1,
      n = !1,
      p = zt(P => {
        s = P;
      });
    function _() {
      return A ? (l = !0, E8(void 0)) : (A = !0, ot(t.read(), P => {
        if (l = !1, P.done) return o || i.close(), n || c.close(), o && n || s(void 0), null;
        let k = P.value,
          x = k,
          f = k;
        return o || i.enqueue(x), n || c.enqueue(f), A = !1, l && _(), null;
      }, () => (A = !1, null)), E8(void 0));
    }
    function m(P) {
      if (o = !0, r = P, n) {
        let k = [r, h],
          x = t.cancel(k);
        s(x);
      }
      return p;
    }
    function b(P) {
      if (n = !0, h = P, o) {
        let k = [r, h],
          x = t.cancel(k);
        s(x);
      }
      return p;
    }
    let y = new me({
        start(P) {
          i = P;
        },
        pull: _,
        cancel: m
      }),
      u = new me({
        start(P) {
          c = P;
        },
        pull: _,
        cancel: b
      });
    return SbT(t.closed, P => (i.error(P), c.error(P), o && n || s(void 0), null)), [y, u];
  }(T);
}