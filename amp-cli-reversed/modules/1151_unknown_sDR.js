async function sDR(T, R, a) {
  if (T = await T, pDR(T)) return T;
  if (ADR(T)) {
    let t = await T.blob();
    R || (R = new URL(T.url).pathname.split(/[\\/]/).pop() ?? "unknown_file");
    let r = OU(t) ? [await t.arrayBuffer()] : [t];
    return new YV(r, R, a);
  }
  let e = await oDR(T);
  if (R || (R = lDR(T) ?? "unknown_file"), !a?.type) {
    let t = e[0]?.type;
    if (typeof t === "string") a = {
      ...a,
      type: t
    };
  }
  return new YV(e, R, a);
}