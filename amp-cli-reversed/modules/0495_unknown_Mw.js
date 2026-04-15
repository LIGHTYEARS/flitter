function q8(T, R = !0) {
  let a = 0,
    e = B9(T);
  for (let t of e) a += J8(t, R);
  return a;
}
function Mw(T, R, a = !0, e = "\u2026") {
  if (R <= 0) return "";
  let t = 0,
    r = "",
    h = B9(T);
  for (let i of h) {
    let c = J8(i, a);
    if (t + c > R) {
      let s = q8(e, a);
      if (t + s <= R) r += e;
      break;
    }
    r += i, t += c;
  }
  return r;
}