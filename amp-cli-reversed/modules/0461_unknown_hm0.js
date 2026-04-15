async function hm0(T) {
  let R = Jb0(),
    a = gs(R, "package"),
    e = T || (await Tm0());
  if (!rm0(R, e)) {
    J.debug("Bootstrap installation is already up to date", {
      version: e
    });
    return;
  }
  J.debug("Updating bootstrap installation", {
    version: e,
    ampHome: R
  });
  let {
      tarballUrl: t,
      integrity: r
    } = await Rm0(e),
    h = gs(R, ".package.staging");
  try {
    if (Sl(h)) k$(h, {
      recursive: !0
    });
    Yb0(h, {
      recursive: !0
    }), await tm0(t, h, r);
    let i = gs(h, "package");
    if (!Sl(i)) throw Error("package/ directory not found in npm tarball");
    let c = gs(i, "dist", "main.js");
    if (!Sl(c)) throw Error("dist/main.js not found in extracted package");
    if (Sl(a)) {
      let s = gs(R, ".package.backup");
      if (Sl(s)) k$(s, {
        recursive: !0
      });
      nxT(a, s);
    }
    nxT(i, a), k$(h, {
      recursive: !0
    }), J.debug("Bootstrap installation updated successfully", {
      version: e
    });
  } catch (i) {
    if (Sl(h)) k$(h, {
      recursive: !0
    });
    throw i;
  }
}