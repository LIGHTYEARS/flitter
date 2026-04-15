function _w0(T, R, a) {
  if (!a.eNotation) return T;
  let e = R.match(pw0);
  if (e) {
    let t = e[1] || "",
      r = e[3].indexOf("e") === -1 ? "E" : "e",
      h = e[2],
      i = t ? T[h.length + 1] === r : T[h.length] === r;
    if (h.length > 1 && i) return T;else if (h.length === 1 && (e[3].startsWith(`.${r}`) || e[3][0] === r)) return Number(R);else if (a.leadingZeros && !i) return R = (e[1] || "") + e[3], Number(R);else return T;
  } else return T;
}