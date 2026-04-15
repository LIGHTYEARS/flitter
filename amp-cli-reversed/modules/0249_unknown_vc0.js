function eF(T) {
  return T.endsWith("/") ? T.slice(0, -1) : T;
}
function vc0(T) {
  let R = pFT(T);
  try {
    let t = new URL(R);
    return eF(`${t.host}${t.pathname}`).replace(/^\//, "");
  } catch {}
  let a = R.match(/^[^@]+@([^:/]+)[:/](.+)$/);
  if (a?.[1] && a[2]) return eF(`${a[1]}/${a[2]}`).replace(/\.git$/, "");
  let e = R.match(/^([^:]+):(.+)$/);
  if (e?.[1] && e[2]) return eF(`${e[1]}/${e[2]}`).replace(/\.git$/, "");
  return null;
}