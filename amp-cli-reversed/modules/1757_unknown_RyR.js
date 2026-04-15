function RyR(T) {
  let R = [],
    a = "",
    e = 0;
  for (; e < T.length;) {
    let t = T.indexOf("\r", e),
      r = T.indexOf(`
`, e),
      h = -1;
    if (t !== -1 && r !== -1 ? h = Math.min(t, r) : t !== -1 ? t === T.length - 1 ? h = -1 : h = t : r !== -1 && (h = r), h === -1) {
      a = T.slice(e);
      break;
    } else {
      let i = T.slice(e, h);
      R.push(i), e = h + 1, T[e - 1] === "\r" && T[e] === `
` && e++;
    }
  }
  return [R, a];
}