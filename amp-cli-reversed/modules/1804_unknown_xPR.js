function xPR(T, R) {
  if ("url" in T) {
    let e = ulT(T.url);
    return R.flatMap(t => t.remotes?.map(r => ulT(r.url)) ?? []).includes(e);
  }
  let a = kPR(T);
  if (a) return R.flatMap(e => e.packages?.map(t => ({
    registryType: t.registryType,
    identifier: t.identifier
  })) ?? []).some(e => e.registryType === a.registryType && e.identifier === a.identifier);
  return !1;
}