function Jj0(T, R) {
  return T - R;
}
function VfT(T, R) {
  let a = /\\(?=[!-/:-@[-`{-~])/g,
    e = [],
    t = [],
    r = T + R,
    h = -1,
    i = 0,
    c;
  while (c = a.exec(r)) e.push(c.index);
  while (++h < e.length) {
    if (i !== e[h]) t.push(T.slice(i, e[h]));
    t.push("\\"), i = e[h];
  }
  return t.push(T.slice(i)), t.join("");
}