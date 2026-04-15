function No(T, R) {
  return (Array.isArray(R) ? R : [R]).some(a => {
    var e;
    let t = ((e = T === null || T === void 0 ? void 0 : T.def) === null || e === void 0 ? void 0 : e.type) === fr0[a];
    if (a === "ZodDiscriminatedUnion") return t && "discriminator" in T.def;
    return t;
  });
}