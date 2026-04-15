function ydR(T) {
  return ac(this, arguments, function* () {
    var R, a, e, t;
    let r = new Uint8Array();
    try {
      for (var h = !0, i = ec(T), c; c = yield S9(i.next()), R = c.done, !R; h = !0) {
        t = c.value, h = !1;
        let s = t;
        if (s == null) continue;
        let A = s instanceof ArrayBuffer ? new Uint8Array(s) : typeof s === "string" ? G8T(s) : s,
          l = new Uint8Array(r.length + A.length);
        l.set(r), l.set(A, r.length), r = l;
        let o;
        while ((o = mdR(r)) !== -1) yield yield S9(r.slice(0, o)), r = r.slice(o);
      }
    } catch (s) {
      a = {
        error: s
      };
    } finally {
      try {
        if (!h && !R && (e = i.return)) yield S9(e.call(i));
      } finally {
        if (a) throw a.error;
      }
    }
    if (r.length > 0) yield yield S9(r);
  });
}