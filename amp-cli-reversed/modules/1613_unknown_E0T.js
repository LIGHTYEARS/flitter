function dn(T) {
  let {
    provider: R,
    model: a
  } = RO(T);
  for (let e of Object.values(n8)) if (e.provider === R && e.name === a) return e;
  return oN(R);
}
function E0T(T) {
  for (let a of Object.values(n8)) if (a.name === T) return a;
  let R = T.match(/^(.*)-\d{4}-\d{2}-\d{2}$/);
  if (R) {
    let a = R[1];
    for (let e of Object.values(n8)) if (e.name === a) return e;
  }
  return;
}