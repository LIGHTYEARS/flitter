async function aW0(T) {
  if (J.debug("jetbrains-plugin-download", {
    message: "Starting download",
    pluginPath: T
  }), kB(T)) return J.debug("jetbrains-plugin-download", {
    message: "Plugin already exists, skipping download",
    pluginPath: T
  }), T;
  return await tW0(T), J.info("jetbrains-plugin-install:downloadSuccess", {
    path: T
  }), T;
}