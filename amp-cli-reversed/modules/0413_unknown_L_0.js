function fVT(T) {
  return d_0.join(T.dataDir, C_0);
}
function L_0(T) {
  let R = new Sb(J).scoped("secrets.file"),
    a = new W0(),
    e,
    t = fVT(T),
    r = new Cm();
  async function h() {
    try {
      await Ow.mkdir(T.dataDir, {
        recursive: !0
      });
    } catch (s) {
      throw R.error(`Failed to create data directory: ${s}`), s;
    }
  }
  async function i() {
    if (e) return e;
    try {
      await h();
      let s = await Ow.readFile(t, "utf-8");
      return e = JSON.parse(s), e;
    } catch (s) {
      if (s.code === "ENOENT") return e = {}, e;
      throw R.error("Failed to read secrets", {
        secretsPath: t,
        error: s
      }), s;
    }
  }
  async function c(s) {
    await r.acquire();
    try {
      await h(), await iY(t, () => ({
        newContent: JSON.stringify(s, null, 2)
      }), {
        mode: 384
      }), e = s;
    } catch (A) {
      throw R.error("Failed to write secrets", {
        secretsPath: t,
        error: A
      }), A;
    } finally {
      r.release();
    }
  }
  return {
    async get(s, A) {
      let l = await i(),
        o = ID(A);
      return l[`${s}@${o}`];
    },
    async set(s, A, l) {
      let o = ID(l),
        n = `${s}@${o}`,
        p = await i();
      p[n] = A, await c(p), a.next(n);
    },
    changes: a
  };
}