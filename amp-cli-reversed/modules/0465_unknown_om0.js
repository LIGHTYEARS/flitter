async function om0(T) {
  try {
    let R = process.env.AMP_HOME;
    if (!R) throw Error("AMP_HOME environment variable is not set");
    let a = `${R}/bin/bun`,
      e = await AxT(a);
    if (!e) return J.warn("Unable to determine Bun version, skipping update"), !1;
    let t = WVT(_F);
    if (!t) throw Error(`Invalid EXPECTED_BUN_VERSION: ${_F}`);
    if (J.debug("Checking Bun version", {
      currentVersion: e,
      expectedVersion: t
    }), !cm0(e, t)) return !1;
    J.info("Updating Bun", {
      currentVersion: e.join("."),
      expectedMinimum: _F
    }), T?.("bun upgrade"), await sm0(a);
    let r = await AxT(a);
    return J.info("Bun updated", {
      newVersion: r
    }), !0;
  } catch (R) {
    return J.warn("Failed to update Bun", {
      error: R instanceof Error ? R.message : String(R)
    }), !1;
  }
}