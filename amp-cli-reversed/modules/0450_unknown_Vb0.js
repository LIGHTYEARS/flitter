function tQ0() {
  return;
}
async function Vb0(T, R) {
  let a = qb0(),
    e = BVT();
  sxT(e);
  let t = mS(e, "bin");
  sxT(t);
  let r = T || (await Fb0()),
    h = a.startsWith("windows"),
    i = h ? `amp-${a}.exe` : `amp-${a}`,
    c = `${a}-amp.sha256`,
    s = `${nY}/${r}/${i}`,
    A = `${nY}/${r}/${c}`,
    l = NVT(),
    o = mS(t, h ? "amp.download.tmp.exe" : "amp.download.tmp");
  J.debug("Downloading binary update", {
    platform: a,
    version: r,
    binaryUrl: s
  });
  try {
    let n = await lY(A);
    if (!n.ok) throw Error(`Failed to fetch checksum: ${n.status}`);
    let p = (await n.text()).trim();
    J.debug("Downloading binary", {
      binaryUrl: s
    });
    let _ = await lY(s);
    if (!_.ok) throw Error(`Failed to download binary: ${_.status}`);
    let m = await Hb0(_, (b, y) => {
      R?.(`Downloading update ${Ub0(b, y)}`);
    });
    if (Db0(o, m), zb0(o, p), !h) wVT(o, 493);
    if (h) {
      if (Gb0(l)) {
        Kb0(l, o);
        return;
      }
      jv(o, l), J.info("Binary updated successfully", {
        binaryPath: l
      });
      return;
    }
    jv(o, l), J.info("Binary updated successfully", {
      binaryPath: l
    });
  } catch (n) {
    if (ptT(o)) try {
      _tT(o);
    } catch {}
    throw Error(`Binary update failed: ${n instanceof Error ? n.message : String(n)}`);
  }
}