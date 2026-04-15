function CiR(T, R) {
  let a = Sn(T._zod.def, {
    get shape() {
      let e = {
        ...T._zod.def.shape,
        ...R._zod.def.shape
      };
      return HA(this, "shape", e), e;
    },
    get catchall() {
      return R._zod.def.catchall;
    },
    checks: []
  });
  return di(T, a);
}