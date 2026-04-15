async function YxR(T, R, a) {
  if (V7T(), T = await T, R || (R = wL(T, !0)), ZxR(T)) {
    if (T instanceof File && R == null && a == null) return T;
    return OP([await T.arrayBuffer()], R ?? T.name, {
      type: T.type,
      lastModified: T.lastModified,
      ...a
    });
  }
  if (JxR(T)) {
    let t = await T.blob();
    return R || (R = new URL(T.url).pathname.split(/[\\/]/).pop()), OP(await aK(t), R, a);
  }
  let e = await aK(T);
  if (!a?.type) {
    let t = e.find(r => typeof r === "object" && "type" in r && r.type);
    if (typeof t === "string") a = {
      ...a,
      type: t
    };
  }
  return OP(e, R, a);
}