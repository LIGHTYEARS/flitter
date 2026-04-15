async function FHR() {
  let T = rw.join(cA, "bin", HU);
  return N5T(T);
}
async function GHR(T, R = !1) {
  let a = rw.join(T, HU);
  if (!R && B5T(a)) return J.info("ripgrep already installed", {
    path: a
  }), a;
  return N5T(a);
}
async function KHR(T) {
  let R = rw.basename(T),
    a = `https://storage.googleapis.com/amp-public-assets-prod-0/ripgrep/ripgrep-binaries/${XHR()}`,
    e = `${a}/${R}`,
    t = `${a}/${R}.sha256`,
    r = await fetch(t);
  if (!r.ok) throw Error(`failed to download ripgrep checksum: ${r.status} ${r.statusText}`);
  let h = (await r.text()).trim().split(/\s+/)[0],
    i = await fetch(e);
  if (!i.ok || !i.body) {
    let s = await i.text();
    throw Error(`failed to download ripgrep binary: ${i.status} ${i.statusText}
${s}`);
  }
  let c = `${T}.${process.pid}.${Date.now()}.tmp`;
  try {
    await wHR(rw.dirname(T), {
      recursive: !0
    });
    let s = MHR(c),
      A = HHR.fromWeb(i.body);
    await WHR(A, s);
    let l = await VHR(c);
    if (l !== h) throw Error(`ripgrep checksum validation failed: expected ${h}, got ${l}`);
    await DHR(c, 493);
    try {
      await NHR(c, T);
    } catch (o) {
      if (o instanceof Error && "code" in o && o.code === "EEXIST") return;
      throw o;
    }
  } finally {
    await UHR(c).catch(() => {});
  }
}