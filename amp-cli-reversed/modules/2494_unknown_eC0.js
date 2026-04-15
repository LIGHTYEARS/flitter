function RC0(T) {
  let R = T >>> 0;
  if (R === 0) R = 2654435769;
  return () => {
    return R = R * 1664525 + 1013904223 >>> 0, R / 4294967296;
  };
}
function eC0(T, R, a) {
  let e = Math.max(T.length, R.length),
    t = [];
  for (let r = 0; r < e; r++) {
    let h = T[r] ?? " ",
      i = R[r] ?? " ",
      c = h === " " || h === `
` || h === "\t",
      s = i === " " || i === `
` || i === "\t";
    if (c && s) {
      t.push(a < 0.5 ? h : i);
      continue;
    }
    let A = r / e * 0.4,
      l = Math.max(0, Math.min(1, (a - A) / (1 - A)));
    if (l === 0) t.push(h);else if (l >= 1) t.push(i);else if (c) t.push(l < 0.7 ? " " : i);else if (s) t.push(l < 0.3 ? h : " ");else if (l < 0.5) {
      let o = l * 2;
      if (Math.random() < o) t.push(V4[Math.floor(Math.random() * V4.length)]);else t.push(h);
    } else {
      let o = (l - 0.5) * 2;
      if (Math.random() < o) t.push(i);else t.push(V4[Math.floor(Math.random() * V4.length)]);
    }
  }
  return t.join("").trimEnd();
}