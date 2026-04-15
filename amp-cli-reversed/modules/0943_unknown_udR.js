function udR(T, R) {
  return ac(this, arguments, function* () {
    var a, e, t, r;
    if (!T.body) {
      if (R.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative") throw new Ah("The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api");
      throw new Ah("Attempted to iterate over a response with no body");
    }
    let h = new g6T(),
      i = new G$(),
      c = f6T(T.body);
    try {
      for (var s = !0, A = ec(ydR(c)), l; l = yield S9(A.next()), a = l.done, !a; s = !0) {
        r = l.value, s = !1;
        let o = r;
        for (let n of i.decode(o)) {
          let p = h.decode(n);
          if (p) yield yield S9(p);
        }
      }
    } catch (o) {
      e = {
        error: o
      };
    } finally {
      try {
        if (!s && !a && (t = A.return)) yield S9(t.call(A));
      } finally {
        if (e) throw e.error;
      }
    }
    for (let o of i.flush()) {
      let n = h.decode(o);
      if (n) yield yield S9(n);
    }
  });
}