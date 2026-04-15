async function v_0(T) {
  let R = await kVT(T.settingsFile ?? dA, dA),
    a = await xVT({
      ...T,
      settingsFile: R
    });
  return {
    ...a,
    async set(e, t) {
      return Kk(e, "global"), a.set(e, t);
    },
    async delete(e) {
      return Kk(e, "global"), a.delete(e);
    }
  };
}