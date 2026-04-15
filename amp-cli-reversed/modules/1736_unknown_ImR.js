async function ImR(T, R, a, e) {
  let t = R ? Math.max(1, R[0]) : 1,
    r = R ? Math.max(t, R[1]) : t + 1000 - 1,
    h = [],
    i = 0,
    [{
      createInterface: c
    }, {
      createReadStream: s
    }] = await Promise.all([import("readline"), import("fs")]),
    A = c({
      input: s(T.fsPath, {
        encoding: "utf8",
        highWaterMark: 65536
      }),
      crlfDelay: 1 / 0
    }),
    l = xN(a, () => A.close()),
    o = 20000,
    n = !1;
  try {
    for await (let _ of A) {
      if (i++, i < t) continue;
      if (i > r) {
        if (!n) n = !0;
        if (i >= o) break;
        continue;
      }
      h.push(Mb.pruneWideLine(_, e));
    }
  } finally {
    l(), A.close();
  }
  if (t > 1) h.unshift(`[... omitted lines 1 to ${t - 1} ...]`);
  if (n) {
    let _ = i >= o ? `${o}+` : String(i);
    h.push(`[... omitted lines ${r + 1} to ${_} ...]`);
  }
  let p = t;
  return h.map(_ => _.startsWith("[... omitted lines") ? _ : `${p++}: ${_}`);
}