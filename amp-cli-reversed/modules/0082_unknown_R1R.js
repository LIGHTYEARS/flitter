function R1R(T, R, a, e) {
  let t = 0,
    r = "";
  do {
    let h = T[e - 1] === "\r";
    r += T.slice(t, h ? e - 1 : e) + R + (h ? `\r
` : `
`) + a, t = e + 1, e = T.indexOf(`
`, t);
  } while (e !== -1);
  return r += T.slice(t), r;
}