function ZD(T) {
  let R = T.headers.get("WWW-Authenticate");
  if (!R) return {};
  let [a, e] = R.split(" ");
  if (a.toLowerCase() !== "bearer" || !e) return {};
  let t = wq(T, "resource_metadata") || void 0,
    r;
  if (t) try {
    r = new URL(t);
  } catch {}
  let h = wq(T, "scope") || void 0,
    i = wq(T, "error") || void 0;
  return {
    resourceMetadataUrl: r,
    scope: h,
    error: i
  };
}