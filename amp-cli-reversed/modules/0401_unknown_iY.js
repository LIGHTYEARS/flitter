async function iY(T, R, a) {
  let e = await yl.realpath(T).catch(s => s.code === "ENOENT" ? T : Promise.reject(s)),
    t = await yl.readFile(e, "utf-8").catch(s => s.code === "ENOENT" ? "{}" : Promise.reject(s)),
    r = R(t);
  if (t === r.newContent) return;
  let h = bg.dirname(e);
  await yl.mkdir(h, {
    recursive: !0
  });
  let i = await yl.mkdtemp(bg.join(h, ".amp-temp-")),
    c = bg.join(i, bg.basename(T));
  try {
    await yl.writeFile(c, r.newContent, {
      encoding: "utf-8",
      flush: !0,
      ...(a?.mode !== void 0 ? {
        mode: a.mode
      } : {})
    }), await yl.rename(c, e), await P_0(bg.dirname(e));
    return;
  } finally {
    await yl.rm(i, {
      recursive: !0,
      force: !0
    });
  }
}