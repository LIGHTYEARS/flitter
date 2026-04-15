async function AdR(T, R, a) {
  if (G6T(), T = await T, mER(T)) {
    if (T instanceof File) return T;
    return p5([await T.arrayBuffer()], T.name);
  }
  if (uER(T)) {
    let t = await T.blob();
    return R || (R = new URL(T.url).pathname.split(/[\\/]/).pop()), p5(await DK(t), R, a);
  }
  let e = await DK(T);
  if (R || (R = ldR(T)), !(a === null || a === void 0 ? void 0 : a.type)) {
    let t = e.find(r => typeof r === "object" && "type" in r && r.type);
    if (typeof t === "string") a = Object.assign(Object.assign({}, a), {
      type: t
    });
  }
  return p5(e, R, a);
}