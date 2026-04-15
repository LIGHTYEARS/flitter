function H3T(T) {
  T._readyPromise_resolve !== void 0 && (T._readyPromise_resolve(void 0), T._readyPromise_resolve = void 0, T._readyPromise_reject = void 0, T._readyPromiseState = "fulfilled");
}
function HbT(T, R, a, e, t, r) {
  let h = T.getReader(),
    i = R.getWriter();
  ub(T) && (T._disturbed = !0);
  let c,
    s,
    A,
    l = !1,
    o = !1,
    n = "readable",
    p = "writable",
    _ = !1,
    m = !1,
    b = zt(u => {
      A = u;
    }),
    y = Promise.resolve(void 0);
  return zt((u, P) => {
    let k;
    function x() {
      if (l) return;
      let j = zt((d, C) => {
        (function L(w) {
          w ? d() : rn(function () {
            if (l) return E8(!0);
            return rn(i.ready, () => rn(h.read(), D => !!D.done || (y = i.write(D.value), vk(y), !1)));
          }(), L, C);
        })(!1);
      });
      vk(j);
    }
    function f() {
      return n = "closed", a ? S() : I(() => (Os(R) && (_ = Ql(R), p = R._state), _ || p === "closed" ? E8(void 0) : p === "erroring" || p === "errored" ? m9(s) : (_ = !0, i.close())), !1, void 0), null;
    }
    function v(j) {
      return l || (n = "errored", c = j, e ? S(!0, j) : I(() => i.abort(j), !0, j)), null;
    }
    function g(j) {
      return o || (p = "errored", s = j, t ? S(!0, j) : I(() => h.cancel(j), !0, j)), null;
    }
    if (r !== void 0 && (k = () => {
      let j = r.reason !== void 0 ? r.reason : new dHT("Aborted", "AbortError"),
        d = [];
      e || d.push(() => p === "writable" ? i.abort(j) : E8(void 0)), t || d.push(() => n === "readable" ? h.cancel(j) : E8(void 0)), I(() => Promise.all(d.map(C => C())), !0, j);
    }, r.aborted ? k() : r.addEventListener("abort", k)), ub(T) && (n = T._state, c = T._storedError), Os(R) && (p = R._state, s = R._storedError, _ = Ql(R)), ub(T) && Os(R) && (m = !0, A()), n === "errored") v(c);else if (p === "erroring" || p === "errored") g(s);else if (n === "closed") f();else if (_ || p === "closed") {
      let j = TypeError("the destination writable stream closed before all data could be piped to it");
      t ? S(!0, j) : I(() => h.cancel(j), !0, j);
    }
    function I(j, d, C) {
      function L() {
        return p !== "writable" || _ ? w() : jbT(function () {
          let D;
          return E8(function B() {
            if (D !== y) return D = y, hc(y, B, B);
          }());
        }(), w), null;
      }
      function w() {
        return j ? ot(j(), () => O(d, C), D => O(!0, D)) : O(d, C), null;
      }
      l || (l = !0, m ? L() : jbT(b, L));
    }
    function S(j, d) {
      I(void 0, j, d);
    }
    function O(j, d) {
      return o = !0, i.releaseLock(), h.releaseLock(), r !== void 0 && r.removeEventListener("abort", k), j ? P(d) : u(void 0), null;
    }
    l || (ot(h.closed, f, v), ot(i.closed, function () {
      return o || (p = "closed"), null;
    }, g)), m ? x() : aM(() => {
      m = !0, A(), x();
    });
  });
}