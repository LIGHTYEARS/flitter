async function tm0(T, R, a) {
  let e = gs(R, "package.tgz");
  J.debug("Downloading package from npm registry", {
    tarballUrl: T
  });
  let t = await btT(T);
  if (!t.ok) throw Error("Failed to download package from npm registry");
  let r = await t.arrayBuffer();
  Qb0(e, new Uint8Array(r));
  let h = am0(a);
  em0(e, h);
  let i = !1;
  try {
    if (i) AF("where tar", {
      stdio: "pipe"
    });else AF("which tar", {
      stdio: "pipe"
    });
  } catch {
    throw Error("tar command not found. Please install tar to extract packages.");
  }
  try {
    AF(`tar -xzf "${e}" -C "${R}"`, {
      stdio: "pipe"
    });
  } catch (c) {
    throw Error(`Failed to extract tarball: ${c instanceof Error ? c.message : String(c)}`);
  }
  k$(e);
}