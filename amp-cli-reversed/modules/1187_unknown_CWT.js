function CWT(T, R, a) {
  async function e(t, r) {
    let h = {};
    h.before = await voT(T, t), await r(), h.after = await voT(T, t), p7R(h), await R.record({
      toolUse: a,
      uri: t,
      ...h
    });
  }
  return {
    ...T,
    async writeFile(t, r, h) {
      await e(t, () => T.writeFile(t, r, h));
    }
  };
}