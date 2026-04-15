function D_0(T) {
  return typeof T === "function";
}
async function w_0() {
  let T = Reflect.get(globalThis, "__AMP_KEYRING_ENTRY_CLASS__");
  if (D_0(T)) return T;
  return (await Promise.resolve().then(() => E3R(MhT(), 1))).Entry;
}
async function B_0() {
  let T = new Sb(J).scoped("secrets.native"),
    R = new W0(),
    a = {},
    e = await w_0();
  async function t(r, h) {
    let i;
    try {
      i = new URL(h).hostname;
    } catch {
      i = h;
    }
    return new e(`amp.cli.${r}`, i);
  }
  return {
    async get(r, h) {
      let i = ID(h),
        c = `${r}@${i}`;
      if (c in a) return a[c];
      let s = await t(r, i);
      try {
        let A = s.getPassword() || void 0;
        return a[c] = A, A;
      } catch (A) {
        T.warn("failed to get secret", {
          name: r,
          url: h,
          error: A
        }), a[c] = void 0;
        return;
      }
    },
    async set(r, h, i) {
      let c = ID(i),
        s = await t(r, c);
      if (h) s.setPassword(h);else s.deleteCredential();
      let A = `${r}@${c}`;
      a[A] = h, R.next(A);
    },
    changes: R
  };
}