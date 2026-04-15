function RW0(T) {
  let R = T.match(/^0\.(\d+)\./);
  if (!R || !R[1]) return !1;
  return parseInt(R[1], 10) >= 12;
}
function ggT(T, R) {
  let a = kA.join(T, "version.txt");
  if (J.debug("jetbrains-plugin-discovery", {
    ampPluginDir: T
  }), !kB(T)) return J.debug("jetbrains-plugin-discovery", {
    message: "Plugin directory does not exist",
    ampPluginDir: T
  }), {
    needsInstall: !0,
    installType: "fresh"
  };
  try {
    if (kB(a)) {
      let e = bH0(a, "utf8").trim(),
        t = !RW0(e) && e !== R;
      return J.debug("jetbrains-plugin-discovery", {
        needsUpdate: t,
        installedVersion: e,
        targetVersion: R
      }), {
        needsInstall: t,
        installType: "upgrade",
        installedVersion: e
      };
    } else return J.debug("jetbrains-plugin-discovery", {
      message: "No version file found, plugin needs to be installed"
    }), {
      needsInstall: !0,
      installType: "upgrade"
    };
  } catch (e) {
    return J.error("jetbrains-plugin-discovery", {
      message: "Error reading version file",
      versionFilePath: a,
      error: e
    }), {
      needsInstall: !0,
      installType: "upgrade"
    };
  }
}