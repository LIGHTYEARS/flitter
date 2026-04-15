function zP0(T) {
  return T.replace(/^(?:[-\\|/] |[\u2800-\u28ff] )/u, "");
}
function Uw(T, R) {
  return Nw(T, R);
}
function Hy(T, R) {
  GP(T, Nw(R, T));
}
function FP0(T) {
  if (!OH(T)) return [];
  let R = new Zx(d_, nl),
    a = new Xk(Zy0),
    e = new SH(d_, nl, d_, nl, d_, nl, 0, "smart", "intensity", {
      r: 14,
      g: 130,
      b: 129
    }, {
      r: 88,
      g: 245,
      b: 227
    }, LT.default(), a);
  e.layout(o0.tight(d_, nl)), e.paint(R, 0, 0);
  let t = R.getBuffer().getCells(),
    r = 0;
  for (let c = 0; c < nl; c += 1) if (t[c].some(s => s.char !== " ")) {
    r = c;
    break;
  }
  let h = nl - 1;
  for (let c = nl - 1; c >= 0; c -= 1) if (t[c].some(s => s.char !== " ")) {
    h = c;
    break;
  }
  if (h < r) return [];
  let i = [];
  for (let c = r; c <= h; c += 1) {
    let s = "";
    for (let A = 0; A < d_; A += 1) {
      let l = t[c][A];
      s += `${GP0(l.style.fg, T)}${l.char}${Jy0}`;
    }
    i.push(s);
  }
  return i;
}