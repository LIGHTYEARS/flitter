async function zd0(T) {
  let R = AIT.get(T);
  if (R) return R;
  let a = qF.get(T);
  if (a) return a;
  let e = (async () => {
    let t;
    try {
      t = new URL(T);
    } catch {
      throw Error("Invalid image URL");
    }
    if (t.protocol !== "http:" && t.protocol !== "https:") throw Error("Only HTTP(S) image URLs are supported");
    let r = await fetch(t);
    if (!r.ok) throw Error(`Failed to fetch image URL (HTTP ${r.status})`);
    let h = Buffer.from(await r.arrayBuffer()),
      i = FQT(h, r.headers.get("content-type"), t);
    if (!i) throw Error("Unsupported image format");
    let c = XA({
      source: {
        type: "file",
        path: t.toString(),
        data: h
      }
    });
    if (c !== null) throw Error(c);
    await Dd0(lIT, {
      recursive: !0
    });
    let s = Md0("sha256").update(t.toString()).digest("hex"),
      A = Ud0[i],
      l = tB.join(lIT, `${s}${A}`);
    await wd0(l, h);
    let o = {
      filePath: l,
      mediaType: i,
      fileSizeBytes: h.length
    };
    return AIT.set(T, o), o;
  })();
  qF.set(T, e);
  try {
    return await e;
  } finally {
    qF.delete(T);
  }
}