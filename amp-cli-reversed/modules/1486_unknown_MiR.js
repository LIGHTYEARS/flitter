function MiR(T, R, a) {
  let e = Sn(R._zod.def, {
    get shape() {
      let t = R._zod.def.shape,
        r = {
          ...t
        };
      if (a) for (let h in a) {
        if (!(h in r)) throw Error(`Unrecognized key: "${h}"`);
        if (!a[h]) continue;
        r[h] = new T({
          type: "nonoptional",
          innerType: t[h]
        });
      } else for (let h in t) r[h] = new T({
        type: "nonoptional",
        innerType: t[h]
      });
      return HA(this, "shape", r), r;
    }
  });
  return di(R, e);
}