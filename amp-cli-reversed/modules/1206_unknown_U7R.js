async function U7R(T, R, a, e) {
  let t = e?.testing ? "" : T.fsPath,
    r = [],
    h = await a.readdir(T),
    i = await Promise.all(h.filter(l => !I9T(MR.basename(l.uri))).map(async l => {
      try {
        let o = await a.stat(l.uri);
        return {
          name: MR.basename(l.uri),
          isDirectory: o.isDirectory
        };
      } catch {
        return {
          name: MR.basename(l.uri),
          isDirectory: !1
        };
      }
    }));
  i.sort((l, o) => {
    if (l.isDirectory === o.isDirectory) return l.name.localeCompare(o.name);
    return l.isDirectory ? -1 : 1;
  });
  let c = 500,
    s = i.length > c,
    A = i.slice(0, c);
  for (let {
    name: l,
    isDirectory: o
  } of A) {
    let n = t && !t.endsWith("/") ? "/" : "",
      p = `${t}${n}${l}${o ? "/" : ""}`;
    r.push(p);
  }
  if (s) {
    let l = i.length - c;
    r.push(`... and ${l} more ${o9(l, "entry", "entries")}`);
  }
  return r.join(`
`);
}