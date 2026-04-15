function gGT(T) {
  return IGT[T] ??= new RegExp(T === "*" ? "" : `^${T.replace(/\/\*$|([.\\+*[^\]$()])/g, (R, a) => a ? `\\${a}` : "(?:|/.*)")}$`);
}
function zr0() {
  IGT = Object.create(null);
}
function Fr0(T) {
  let R = new Wr0(),
    a = [];
  if (T.length === 0) return qr0;
  let e = T.map(s => [!/\*|\/:/.test(s[0]), ...s]).sort(([s, A], [l, o]) => s ? 1 : l ? -1 : A.length - o.length),
    t = Object.create(null);
  for (let s = 0, A = -1, l = e.length; s < l; s++) {
    let [o, n, p] = e[s];
    if (o) t[n] = [p.map(([m]) => [m, Object.create(null)]), $eT];else A++;
    let _;
    try {
      _ = R.insert(n, A, o);
    } catch (m) {
      throw m === Dy ? new iaT(n) : m;
    }
    if (o) continue;
    a[A] = p.map(([m, b]) => {
      let y = Object.create(null);
      b -= 1;
      for (; b >= 0; b--) {
        let [u, P] = _[b];
        y[u] = P;
      }
      return [m, y];
    });
  }
  let [r, h, i] = R.buildRegExp();
  for (let s = 0, A = a.length; s < A; s++) for (let l = 0, o = a[s].length; l < o; l++) {
    let n = a[s][l]?.[1];
    if (!n) continue;
    let p = Object.keys(n);
    for (let _ = 0, m = p.length; _ < m; _++) n[p[_]] = i[n[p[_]]];
  }
  let c = [];
  for (let s in h) c[s] = a[h[s]];
  return [r, c, t];
}