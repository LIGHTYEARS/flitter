async function rhT(T) {
  let R = await G0R(),
    a = kA.join(T, "jetbrains-plugins", R);
  return J.debug("jetbrains-plugin-download", {
    message: "Ensuring plugin available",
    cacheDir: T,
    pluginFile: R,
    pluginPath: a
  }), await aW0(a), J.debug("jetbrains-plugin-download", {
    message: "Plugin ensured and available",
    pluginPath: a
  }), a;
}