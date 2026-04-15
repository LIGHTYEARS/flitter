function Wq(T) {
  return T.map(MPR);
}
function ckR(T) {
  return T.split(":").filter(Boolean);
}
function skR(T) {
  if (!dG) throw Error("expandPath requires Node.js environment");
  if (T.startsWith("~/") || T === "~") return glT.join(dG, T.slice(1));
  return glT.resolve(T);
}
function Y9T(T) {
  if (!T) return [];
  return ckR(T).map(R => R.trim()).filter(Boolean).map(skR);
}
function okR(T, R) {
  if (R.length === 0) return AR.of([]);
  return new AR(a => {
    let e = new Ls(),
      t = () => {
        a.next(Array.from(e.keys()).toSorted((i, c) => i.toString().localeCompare(c.toString())));
      },
      r = new AbortController();
    Promise.all(R.map(async i => {
      if (umR(i)) return T.findFiles(i, {
        signal: r.signal
      });
      try {
        return await T.stat(i), [i];
      } catch (c) {
        if (c instanceof ur) return [];
        if (typeof c === "object" && c !== null && "code" in c && c.code === "ELOOP") return J.warn("Infinite symlink loop detected in guidance file", {
          file: i.toString()
        }), [];
        throw c;
      }
    })).then(i => {
      for (let c of i.flat()) e.add(c);
      t();
    }).catch(i => {
      if (!r.signal.aborted) r.abort();
      if (!xr(i)) a.error(i);
    });
    let h = R.map(i => T.watch(i, {
      ignoreChanges: !0
    }).subscribe({
      next: c => {
        if (c.type === "create" || c.type === "change") e.add(c.uri);else if (c.type === "delete") e.delete(c.uri);
        t();
      }
    }));
    return () => {
      r.abort();
      for (let i of h) i.unsubscribe();
    };
  });
}