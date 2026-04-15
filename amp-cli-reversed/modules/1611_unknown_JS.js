function JS() {
  if (!NW) {
    let T = typeof process < "u" && process.versions?.node,
      R = !T,
      a = "linux",
      e = "unknown",
      t = "unknown";
    if (T) a = "darwin", e = TAR(a), t = "arm64";else if (typeof navigator < "u") {
      let r = navigator.platform.toLowerCase();
      if (r.includes("mac") || r.includes("ios")) a = "darwin";else if (r.includes("win")) a = "windows";
      let h = navigator.userAgent;
      if (a === "darwin") {
        let i = h.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        if (i?.[1]) e = i[1].replace(/_/g, ".");
      } else if (a === "windows") {
        let i = h.match(/Windows NT (\d+\.\d+)/);
        if (i?.[1]) e = i[1];
      } else {
        let i = h.match(/Linux.*?(\d+\.\d+)/);
        if (i?.[1]) e = i[1];
      }
      if (h.includes("x86_64") || h.includes("WOW64")) t = "x64";else if (h.includes("i686")) t = "x86";else if (h.includes("ARM64") || h.includes("arm64")) t = "arm64";else if (h.includes("ARM")) t = "arm";
    }
    NW = {
      webBrowser: R,
      os: a,
      osVersion: e,
      cpuArchitecture: t,
      client: sN().name,
      optionAltKeyShort: a === "darwin" ? "\u2325" : "Alt",
      ctrlCmdKeyShort: a === "darwin" ? "\u2318" : "\u2303",
      ctrlCmdKey: a === "darwin" ? "\u2318" : "Ctrl"
    };
  }
  return NW;
}