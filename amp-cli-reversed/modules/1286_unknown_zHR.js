function zHR(T) {
  let R = [],
    a = !1;
  return async (...t) => {
    return new Promise((r, h) => {
      R.push({
        args: t,
        resolve: r,
        reject: h
      }), e();
    });
  };
  async function e() {
    if (a || R.length === 0) return;
    a = !0;
    let {
      args: t,
      resolve: r,
      reject: h
    } = R.shift();
    try {
      let i = await T(...t);
      r(i);
    } catch (i) {
      h(i);
    } finally {
      a = !1, e();
    }
  }
}