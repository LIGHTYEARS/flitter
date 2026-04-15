function Nb0(T) {
  if (!T) return;
  let R = Number(T);
  if (!Number.isFinite(R) || R <= 0) return;
  return R;
}
function Ub0(T, R) {
  let a = cxT(T, {
    decimalPlaces: 2
  });
  if (R === void 0) return `(${a})`;
  let e = cxT(R, {
    decimalPlaces: 2
  });
  return `(${a}/${e})`;
}
async function Hb0(T, R) {
  let a = Nb0(T.headers?.get?.("content-length") ?? null),
    e = T.body?.getReader();
  if (!e) {
    let c = new Uint8Array(await T.arrayBuffer());
    return R?.(c.byteLength, a), c;
  }
  let t = [],
    r = 0;
  while (!0) {
    let {
      done: c,
      value: s
    } = await e.read();
    if (c) break;
    if (!s) continue;
    t.push(s), r += s.byteLength, R?.(r, a);
  }
  if (t.length === 1) {
    let [c] = t;
    if (c) return c;
  }
  let h = new Uint8Array(r),
    i = 0;
  for (let c of t) h.set(c, i), i += c.byteLength;
  return h;
}