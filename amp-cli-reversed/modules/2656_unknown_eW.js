function XD0(T, R) {
  let a = 0;
  while (T[R - ++a] === "\\");
  return --a && a % 2;
}
function yQ(T, R = 0, a = T.length) {
  let e = T.indexOf(`
`, R);
  if (T[e - 1] === "\r") e--;
  return e <= a ? e : -1;
}
function eW(T, R) {
  for (let a = R; a < T.length; a++) {
    let e = T[a];
    if (e === `
`) return a;
    if (e === "\r" && T[a + 1] === `
`) return a + 1;
    if (e < " " && e !== "\t" || e === "\x7F") throw new A8("control characters are not allowed in comments", {
      toml: T,
      ptr: R
    });
  }
  return T.length;
}