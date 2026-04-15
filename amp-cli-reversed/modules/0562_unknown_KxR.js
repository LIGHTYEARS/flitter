function KxR(T) {
  let R = typeof T === "function" ? T : T.fetch,
    a = TK.get(R);
  if (a) return a;
  let e = (async () => {
    try {
      let t = "Response" in R ? R.Response : (await R("data:,")).constructor,
        r = new FormData();
      if (r.toString() === (await new t(r).text())) return !1;
      return !0;
    } catch {
      return !0;
    }
  })();
  return TK.set(R, e), e;
}