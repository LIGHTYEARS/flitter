function a6T(T) {
  if (typeof T !== "object" || T === null) return {};
  let R = T,
    a = R.inlinedResponses;
  if (typeof a !== "object" || a === null) return T;
  let e = a.inlinedResponses;
  if (!Array.isArray(e) || e.length === 0) return T;
  let t = !1;
  for (let r of e) {
    if (typeof r !== "object" || r === null) continue;
    let h = r.response;
    if (typeof h !== "object" || h === null) continue;
    if (h.embedding !== void 0) {
      t = !0;
      break;
    }
  }
  if (t) R.inlinedEmbedContentResponses = R.inlinedResponses, delete R.inlinedResponses;
  return T;
}