function SXT(T) {
  let R = FP0(T.output);
  if (R.length === 0) return T.textLines;
  let a = Math.max(R.length, T.textLines.length),
    e = Math.floor((a - R.length) / 2),
    t = Math.floor((a - T.textLines.length) / 2),
    r = [];
  for (let h = 0; h < a; h += 1) {
    let i = h >= e && h < e + R.length ? R[h - e] : " ".repeat(d_),
      c = h >= t && h < t + T.textLines.length ? T.textLines[h - t] : "";
    r.push(`${i}  ${c}`);
  }
  return r;
}