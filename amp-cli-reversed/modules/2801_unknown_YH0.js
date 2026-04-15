async function YH0(T, R, a) {
  J.debug("jetbrains-plugin-install", {
    message: "Starting plugin installation",
    targetCount: T.length,
    targets: T.map(t => `${t.name} ${t.version}`),
    cacheDirectory: R
  });
  let e = await rhT(R);
  for (let t of T) try {
    J.debug("jetbrains-plugin-install:start", {
      product: t
    }), await FH0(t.pluginDirectory, e, a), J.debug("jetbrains-plugin-install:complete", {
      product: t
    });
  } catch (r) {
    throw J.error("jetbrains-plugin-install", {
      product: t,
      error: r
    }), Error(`Failed to install JetBrains plugin to ${t.name} ${t.version}: ${r}`);
  }
  J.info("jetbrains-plugin-install", {
    message: "All plugin installations completed successfully",
    installedCount: T.length
  });
}