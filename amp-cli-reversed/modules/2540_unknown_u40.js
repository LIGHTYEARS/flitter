function u40(T, R, a) {
  let e = new W0(),
    t = (() => {
      let o = new Map();
      return (n, p) => {
        let _ = (o.get(n)?.catch(() => {}) || Promise.resolve()).then(() => p()).finally(() => {
          if (o.get(n) === _) o.delete(n);
        });
        return o.set(n, _), _;
      };
    })(),
    r = a ? MR.joinPath(R, a) : R;
  function h(o) {
    return MR.joinPath(r, `${o.toString()}.json`);
  }
  async function i(o) {
    let n = h(o);
    try {
      let p = await T.readBinaryFile(n),
        _ = 52428800;
      if (p.length > 52428800) {
        let m = Math.round(p.length / 1048576);
        J.warn(`File too large to load safely: ${String(o)} (${m}MB)`, {
          key: String(o),
          size: p.length,
          maxSize: 52428800
        });
        return;
      }
      try {
        let m = p instanceof Uint8Array ? p : new Uint8Array(p);
        return JSON.parse(new TextDecoder().decode(m));
      } catch (m) {
        let b = m,
          {
            contentLength: y,
            contentPreview: u
          } = y40(p);
        J.warn("Corrupted JSON detected.", {
          key: String(o),
          storageUri: r.toString(),
          error: b.message,
          contentLength: y,
          contentPreview: u
        });
        return;
      }
    } catch (p) {
      if (Er(p)) return;
      throw p;
    }
  }
  async function c(o, n) {
    let p = h(o),
      _ = p.with({
        path: p.path + ".amptmp"
      }),
      m = JSON.stringify(n, null, 2);
    await T.mkdirp(MR.joinPath(p, "..")), await t(o, async () => {
      await T.writeFile(_, m), await T.rename(_, p);
    }), e.next(o);
  }
  async function s(o) {
    let n = h(o);
    await t(o, async () => {
      await T.delete(n);
    }), e.next(o);
  }
  async function A() {
    let o;
    try {
      o = await T.readdir(r);
    } catch (p) {
      if (Er(p)) return [];
      throw p;
    }
    let n = o.filter(p => {
      let _ = p.uri.path.split("/").pop() || "";
      return !p.isDirectory && _.endsWith(".json");
    });
    return (await Promise.all(n.map(async p => {
      let _ = (p.uri.path.split("/").pop() || "").slice(0, -5);
      try {
        let m = await T.getMtime(p.uri);
        return {
          key: _,
          mtime: m
        };
      } catch (m) {
        if (!Er(m)) throw m;
        return null;
      }
    }))).filter(p => p !== null).toSorted((p, _) => _.mtime - p.mtime).map(p => p.key);
  }
  async function l(o) {
    return h(o).fsPath;
  }
  return {
    get: i,
    set: c,
    delete: s,
    keys: A,
    path: l,
    changes: e
  };
}