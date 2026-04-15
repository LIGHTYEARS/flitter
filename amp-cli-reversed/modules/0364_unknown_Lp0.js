function Lp0(T) {
  let R = aY(T);
  if (R !== void 0) return R;
  if (!Sw(T) || typeof T.type !== "string") return;
  if (T.type === "snapshot") {
    let e = T.value,
      t = aY(e);
    if (t !== void 0) return t;
    if (typeof e === "string") return zkT(e);
    return;
  }
  if (T.type !== "delta" || !Array.isArray(T.blocks)) return;
  let a = T.blocks.map(e => {
    if (!Sw(e) || e.type !== "text" || typeof e.text !== "string") return "";
    return e.text;
  }).join("");
  return zkT(a);
}