function vUT(T) {
  return fU(T) || IU(T) || $UT(T) || G4R(T) || T.error?.type === "rate_limit_error" || T.status === 429 || K4R(T) || V4R(T);
}
function ev(T) {
  if (T.error?.message) return T.error.message;
  let R = T.message || "",
    a = R.match(/^(?:API error \(\d+\):|HTTP \d+:|Request failed: \d+\s+[^\s]+)\s+/),
    e = (a ? R.replace(a[0], "") : R).replace(/^\d+\s+/, "");
  if (e.includes('{"type":"error"') || e.includes('{"error":')) try {
    let t = JSON.parse(e);
    if (t.error?.message) return t.error.message;
  } catch {}
  return e;
}