class IWT {
  diff(T, R, a = {}) {
    let e;
    if (typeof a === "function") e = a, a = {};else if ("callback" in a) e = a.callback;
    let t = this.castInput(T, a),
      r = this.castInput(R, a),
      h = this.removeEmpty(this.tokenize(t, a)),
      i = this.removeEmpty(this.tokenize(r, a));
    return this.diffWithOptionsObj(h, i, a, e);
  }
  diffWithOptionsObj(T, R, a, e) {
    var t;
    let r = b => {
        if (b = this.postProcess(b, a), e) {
          setTimeout(function () {
            e(b);
          }, 0);
          return;
        } else return b;
      },
      h = R.length,
      i = T.length,
      c = 1,
      s = h + i;
    if (a.maxEditLength != null) s = Math.min(s, a.maxEditLength);
    let A = (t = a.timeout) !== null && t !== void 0 ? t : 1 / 0,
      l = Date.now() + A,
      o = [{
        oldPos: -1,
        lastComponent: void 0
      }],
      n = this.extractCommon(o[0], R, T, 0, a);
    if (o[0].oldPos + 1 >= i && n + 1 >= h) return r(this.buildValues(o[0].lastComponent, R, T));
    let p = -1 / 0,
      _ = 1 / 0,
      m = () => {
        for (let b = Math.max(p, -c); b <= Math.min(_, c); b += 2) {
          let y,
            u = o[b - 1],
            P = o[b + 1];
          if (u) o[b - 1] = void 0;
          let k = !1;
          if (P) {
            let f = P.oldPos - b;
            k = P && 0 <= f && f < h;
          }
          let x = u && u.oldPos + 1 < i;
          if (!k && !x) {
            o[b] = void 0;
            continue;
          }
          if (!x || k && u.oldPos < P.oldPos) y = this.addToPath(P, !0, !1, 0, a);else y = this.addToPath(u, !1, !0, 1, a);
          if (n = this.extractCommon(y, R, T, b, a), y.oldPos + 1 >= i && n + 1 >= h) return r(this.buildValues(y.lastComponent, R, T)) || !0;else {
            if (o[b] = y, y.oldPos + 1 >= i) _ = Math.min(_, b - 1);
            if (n + 1 >= h) p = Math.max(p, b + 1);
          }
        }
        c++;
      };
    if (e) (function b() {
      setTimeout(function () {
        if (c > s || Date.now() > l) return e(void 0);
        if (!m()) b();
      }, 0);
    })();else while (c <= s && Date.now() <= l) {
      let b = m();
      if (b) return b;
    }
  }
  addToPath(T, R, a, e, t) {
    let r = T.lastComponent;
    if (r && !t.oneChangePerToken && r.added === R && r.removed === a) return {
      oldPos: T.oldPos + e,
      lastComponent: {
        count: r.count + 1,
        added: R,
        removed: a,
        previousComponent: r.previousComponent
      }
    };else return {
      oldPos: T.oldPos + e,
      lastComponent: {
        count: 1,
        added: R,
        removed: a,
        previousComponent: r
      }
    };
  }
  extractCommon(T, R, a, e, t) {
    let r = R.length,
      h = a.length,
      i = T.oldPos,
      c = i - e,
      s = 0;
    while (c + 1 < r && i + 1 < h && this.equals(a[i + 1], R[c + 1], t)) if (c++, i++, s++, t.oneChangePerToken) T.lastComponent = {
      count: 1,
      previousComponent: T.lastComponent,
      added: !1,
      removed: !1
    };
    if (s && !t.oneChangePerToken) T.lastComponent = {
      count: s,
      previousComponent: T.lastComponent,
      added: !1,
      removed: !1
    };
    return T.oldPos = i, c;
  }
  equals(T, R, a) {
    if (a.comparator) return a.comparator(T, R);else return T === R || !!a.ignoreCase && T.toLowerCase() === R.toLowerCase();
  }
  removeEmpty(T) {
    let R = [];
    for (let a = 0; a < T.length; a++) if (T[a]) R.push(T[a]);
    return R;
  }
  castInput(T, R) {
    return T;
  }
  tokenize(T, R) {
    return Array.from(T);
  }
  join(T) {
    return T.join("");
  }
  postProcess(T, R) {
    return T;
  }
  get useLongestToken() {
    return !1;
  }
  buildValues(T, R, a) {
    let e = [],
      t;
    while (T) e.push(T), t = T.previousComponent, delete T.previousComponent, T = t;
    e.reverse();
    let r = e.length,
      h = 0,
      i = 0,
      c = 0;
    for (; h < r; h++) {
      let s = e[h];
      if (!s.removed) {
        if (!s.added && this.useLongestToken) {
          let A = R.slice(i, i + s.count);
          A = A.map(function (l, o) {
            let n = a[c + o];
            return n.length > l.length ? n : l;
          }), s.value = this.join(A);
        } else s.value = this.join(R.slice(i, i + s.count));
        if (i += s.count, !s.added) c += s.count;
      } else s.value = this.join(a.slice(c, c + s.count)), c += s.count;
    }
    return e;
  }
}