function n$0(T) {
  let R = this,
    a = [],
    e = 0,
    t,
    r,
    h;
  return i;
  function i(u) {
    if (e < a.length) {
      let P = a[e];
      return R.containerState = P[1], T.attempt(P[0].continuation, c, s)(u);
    }
    return s(u);
  }
  function c(u) {
    if (e++, R.containerState._closeFlow) {
      if (R.containerState._closeFlow = void 0, t) y();
      let P = R.events.length,
        k = P,
        x;
      while (k--) if (R.events[k][0] === "exit" && R.events[k][1].type === "chunkFlow") {
        x = R.events[k][1].end;
        break;
      }
      b(e);
      let f = P;
      while (f < R.events.length) R.events[f][1].end = {
        ...x
      }, f++;
      return vh(R.events, k + 1, 0, R.events.slice(P)), R.events.length = f, s(u);
    }
    return i(u);
  }
  function s(u) {
    if (e === a.length) {
      if (!t) return o(u);
      if (t.currentConstruct && t.currentConstruct.concrete) return p(u);
      R.interrupt = Boolean(t.currentConstruct && !t._gfmTableDynamicInterruptHack);
    }
    return R.containerState = {}, T.check(DfT, A, l)(u);
  }
  function A(u) {
    if (t) y();
    return b(e), o(u);
  }
  function l(u) {
    return R.parser.lazy[R.now().line] = e !== a.length, h = R.now().offset, p(u);
  }
  function o(u) {
    return R.containerState = {}, T.attempt(DfT, n, p)(u);
  }
  function n(u) {
    return e++, a.push([R.currentConstruct, R.containerState]), o(u);
  }
  function p(u) {
    if (u === null) {
      if (t) y();
      b(0), T.consume(u);
      return;
    }
    return t = t || R.parser.flow(R.now()), T.enter("chunkFlow", {
      _tokenizer: t,
      contentType: "flow",
      previous: r
    }), _(u);
  }
  function _(u) {
    if (u === null) {
      m(T.exit("chunkFlow"), !0), b(0), T.consume(u);
      return;
    }
    if (r9(u)) return T.consume(u), m(T.exit("chunkFlow")), e = 0, R.interrupt = void 0, i;
    return T.consume(u), _;
  }
  function m(u, P) {
    let k = R.sliceStream(u);
    if (P) k.push(null);
    if (u.previous = r, r) r.next = u;
    if (r = u, t.defineSkip(u.start), t.write(k), R.parser.lazy[u.start.line]) {
      let x = t.events.length;
      while (x--) if (t.events[x][1].start.offset < h && (!t.events[x][1].end || t.events[x][1].end.offset > h)) return;
      let f = R.events.length,
        v = f,
        g,
        I;
      while (v--) if (R.events[v][0] === "exit" && R.events[v][1].type === "chunkFlow") {
        if (g) {
          I = R.events[v][1].end;
          break;
        }
        g = !0;
      }
      b(e), x = f;
      while (x < R.events.length) R.events[x][1].end = {
        ...I
      }, x++;
      vh(R.events, v + 1, 0, R.events.slice(f)), R.events.length = x;
    }
  }
  function b(u) {
    let P = a.length;
    while (P-- > u) {
      let k = a[P];
      R.containerState = k[1], k[0].exit.call(R, T);
    }
    a.length = u;
  }
  function y() {
    t.write([null]), r = void 0, t = void 0, R.containerState._closeFlow = void 0;
  }
}