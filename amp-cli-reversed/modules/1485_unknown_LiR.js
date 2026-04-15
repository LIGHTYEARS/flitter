function LiR(T, R, a) {
  let e = R._zod.def.checks;
  if (e && e.length > 0) throw Error(".partial() cannot be used on object schemas containing refinements");
  let t = Sn(R._zod.def, {
    get shape() {
      let r = R._zod.def.shape,
        h = {
          ...r
        };
      if (a) for (let i in a) {
        if (!(i in r)) throw Error(`Unrecognized key: "${i}"`);
        if (!a[i]) continue;
        h[i] = T ? new T({
          type: "optional",
          innerType: r[i]
        }) : r[i];
      } else for (let i in r) h[i] = T ? new T({
        type: "optional",
        innerType: r[i]
      }) : r[i];
      return HA(this, "shape", h), h;
    },
    checks: []
  });
  return di(R, t);
}