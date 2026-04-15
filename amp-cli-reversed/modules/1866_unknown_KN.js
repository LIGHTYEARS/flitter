function KN(T, R, a = {}) {
  let e = [];
  if (e.push(AxR(T, R)), T.title) e.push(`# ${T.title}`);
  let t = pm(T),
    r = t ? t.index : 0;
  for (let i = r; i < T.messages.length; i++) {
    let c = T.messages[i];
    if (c) e.push(pxR(c, a));
  }
  let h = O0T(T);
  if (h) e.push($xR(h));
  return e.join(`

`);
}