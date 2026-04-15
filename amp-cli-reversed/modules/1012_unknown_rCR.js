async function rCR(T, R, a) {
  if (gNT(), T = await T, iCR(T)) {
    if (T instanceof File) return T;
    return X$([await T.arrayBuffer()], T.name);
  }
  if (cCR(T)) {
    let t = await T.blob();
    return R || (R = new URL(T.url).pathname.split(/[\\/]/).pop()), X$(await lV(t), R, a);
  }
  let e = await lV(T);
  if (R || (R = FL(T)), !a?.type) {
    let t = e.find(r => typeof r === "object" && "type" in r && r.type);
    if (typeof t === "string") a = {
      ...a,
      type: t
    };
  }
  return X$(e, R, a);
}