function KmT(T, R) {
  if (!T) return;
  let a = T;
  for (let e of R) if (typeof e === "string") {
    if (a.type !== "object" || !Array.isArray(a.children)) return;
    let t = !1;
    for (let r of a.children) if (Array.isArray(r.children) && r.children[0].value === e && r.children.length === 2) {
      a = r.children[1], t = !0;
      break;
    }
    if (!t) return;
  } else {
    let t = e;
    if (a.type !== "array" || t < 0 || !Array.isArray(a.children) || t >= a.children.length) return;
    a = a.children[t];
  }
  return a;
}