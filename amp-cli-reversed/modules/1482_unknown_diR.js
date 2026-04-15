function diR(T, R) {
  if (!jb(R)) throw Error("Invalid input to extend: expected a plain object");
  let a = T._zod.def.checks;
  if (a && a.length > 0) {
    let t = T._zod.def.shape;
    for (let r in R) if (Object.getOwnPropertyDescriptor(t, r) !== void 0) throw Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
  }
  let e = Sn(T._zod.def, {
    get shape() {
      let t = {
        ...T._zod.def.shape,
        ...R
      };
      return HA(this, "shape", t), t;
    }
  });
  return di(T, e);
}