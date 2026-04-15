function GD0(T) {
  return gS.of(T);
}
function KD0(T, R) {
  let a = T.slice(0, R).split(/\r\n|\n|\r/g);
  return [a.length, a.pop().length + 1];
}
function VD0(T, R, a) {
  let e = T.split(/\r\n|\n|\r/g),
    t = "",
    r = (Math.log10(R + 1) | 0) + 1;
  for (let h = R - 1; h <= R + 1; h++) {
    let i = e[h - 1];
    if (!i) continue;
    if (t += h.toString().padEnd(r, " "), t += ":  ", t += i, t += `
`, h === R) t += " ".repeat(r + a + 2), t += `^
`;
  }
  return t;
}