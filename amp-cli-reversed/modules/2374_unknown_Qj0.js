function Qj0(T, R) {
  let a = [],
    e = 0,
    t = 0,
    r;
  while (r = Yj0.exec(T)) h(T.slice(e, r.index)), a.push(r[0]), e = r.index + r[0].length, t++;
  return h(T.slice(e)), a.join("");
  function h(i) {
    a.push(R(i, t, !i));
  }
}