function A9(T) {
  if (typeof T === "bigint") return T.toString() + "n";
  if (typeof T === "string") return `"${T}"`;
  return `${T}`;
}
function FvT(T) {
  return Object.keys(T).filter(R => {
    return T[R]._zod.optin === "optional" && T[R]._zod.optout === "optional";
  });
}
function SiR(T, R) {
  let a = T._zod.def,
    e = a.checks;
  if (e && e.length > 0) throw Error(".pick() cannot be used on object schemas containing refinements");
  let t = Sn(T._zod.def, {
    get shape() {
      let r = {};
      for (let h in R) {
        if (!(h in a.shape)) throw Error(`Unrecognized key: "${h}"`);
        if (!R[h]) continue;
        r[h] = a.shape[h];
      }
      return HA(this, "shape", r), r;
    },
    checks: []
  });
  return di(T, t);
}