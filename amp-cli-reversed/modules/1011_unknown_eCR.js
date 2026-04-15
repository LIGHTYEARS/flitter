function eCR(T) {
  let R = typeof T === "function" ? T : T.fetch,
    a = sV.get(R);
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
  return sV.set(R, e), e;
}