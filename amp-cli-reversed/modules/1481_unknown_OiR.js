function OiR(T, R) {
  let a = T._zod.def,
    e = a.checks;
  if (e && e.length > 0) throw Error(".omit() cannot be used on object schemas containing refinements");
  let t = Sn(T._zod.def, {
    get shape() {
      let r = {
        ...T._zod.def.shape
      };
      for (let h in R) {
        if (!(h in a.shape)) throw Error(`Unrecognized key: "${h}"`);
        if (!R[h]) continue;
        delete r[h];
      }
      return HA(this, "shape", r), r;
    },
    checks: []
  });
  return di(T, t);
}