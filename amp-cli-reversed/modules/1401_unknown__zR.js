function pzR(T) {
  if (T.some(a => a.startsWith("-c") || a === "--bytes")) return;
  let R = _zR(T);
  return R ? {
    readRange: R
  } : void 0;
}
function _zR(T) {
  let R = 10;
  for (let a = 0; a < T.length; a++) {
    let e = T[a];
    if (e === "-n" || e === "--lines") {
      let t = T[a + 1];
      if (!t) return;
      R = Number.parseInt(t, 10), a += 1;
      continue;
    }
    if (/^-\d+$/.test(e)) R = Number.parseInt(e.slice(1), 10);
  }
  if (!Number.isInteger(R) || R < 1) return;
  return [1, R];
}