async function F0R() {
  return (await z0R()).plugin_version;
}
async function G0R() {
  let T = await F0R();
  return `${q0R}-${T}.zip`;
}
function KH0() {
  let T = ehT();
  return J.debug("jetbrains-plugin-discovery", {
    os: T
  }), ["darwin", "win32"].includes(T);
}
function VH0(T, R) {
  if (!T?.pluginVersion) return "unknown";
  return T?.pluginVersion === R ? "uptodate" : "outdated";
}
function XH0(T, R) {
  if (J.debug("jetbrains-plugin-discovery", {
    ideStatus: T
  }), KH0()) {
    let e = ZH0();
    if (J.debug("jetbrains-plugin-discovery", {
      discoveryResult: e
    }), !e.success) return e;
    let t = e.products.map(r => {
      let h = ggT(r.pluginDirectory, R);
      return {
        ...r,
        installType: h.installType,
        installedVersion: h.installedVersion
      };
    }).filter(r => ggT(r.pluginDirectory, R).needsInstall);
    return J.debug("jetbrains-plugin-discovery", {
      installationTargets: t
    }), {
      success: !0,
      products: t
    };
  }
  let a = VH0(T, R);
  if (J.debug("jetbrains-plugin-discovery", {
    connectedVersionStatus: a
  }), a === "outdated" && T?.pluginDirectory && T?.ideName) return {
    success: !0,
    products: [{
      name: T.ideName,
      version: "",
      pluginDirectory: T.pluginDirectory,
      installType: "upgrade",
      installedVersion: T.pluginVersion
    }]
  };
  if (a === "uptodate") return {
    success: !0,
    products: []
  };
  return {
    success: !0,
    requiresManualInstall: !0,
    products: []
  };
}