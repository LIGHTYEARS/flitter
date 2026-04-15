function fH() {
  if (hs) return hs;
  let T = process.env.NPM_CONFIG_REGISTRY;
  if (T) return hs = pF(T), hs;
  try {
    try {
      let a = lxT("npm config get @sourcegraph:registry", {
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"]
      }).trim();
      if (a && a !== "undefined") return hs = pF(a), hs;
    } catch {}
    let R = lxT("npm config get registry", {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    if (R && R !== "undefined") return hs = pF(R), hs;
  } catch {}
  return hs = "https://registry.npmjs.org", hs;
}