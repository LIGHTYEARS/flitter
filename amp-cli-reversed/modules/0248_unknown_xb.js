function xb() {
  if (u$) return u$;
  let T = gv;
  if (!T) return Promise.resolve();
  return NeT = !0, u$ = new Promise(R => {
    let a = !1,
      e = () => {
        if (!a) {
          if (a = !0, gv === T) gv = void 0;
          R();
        }
      };
    setImmediate(() => {
      try {
        T.once("finish", e).once("error", e).end();
      } catch {
        e();
      }
    }), setTimeout(e, 500);
  }), u$;
}