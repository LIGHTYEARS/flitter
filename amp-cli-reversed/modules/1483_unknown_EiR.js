function EiR(T, R) {
  if (!jb(R)) throw Error("Invalid input to safeExtend: expected a plain object");
  let a = Sn(T._zod.def, {
    get shape() {
      let e = {
        ...T._zod.def.shape,
        ...R
      };
      return HA(this, "shape", e), e;
    }
  });
  return di(T, a);
}