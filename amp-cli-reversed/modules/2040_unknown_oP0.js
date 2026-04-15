function sP0(T) {
  let R = null;
  return {
    promise: new Promise(a => {
      R = setTimeout(a, T);
    }),
    dispose: () => {
      if (R !== null) clearTimeout(R), R = null;
    }
  };
}
function PY(T) {
  return T === Z3T || T === k7R;
}
function oP0(T) {
  let R = null;
  for (let a of T) {
    if (!PY(a.key)) continue;
    if (!R) {
      R = a;
      continue;
    }
    let e = Date.parse(R.updatedAt),
      t = Date.parse(a.updatedAt);
    if (Number.isFinite(e) && Number.isFinite(t)) {
      if (t >= e) R = a;
      continue;
    }
    R = a;
  }
  return R;
}