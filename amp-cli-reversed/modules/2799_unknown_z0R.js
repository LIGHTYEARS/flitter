async function z0R() {
  if (Sg) return J.debug("jetbrains-plugin-version", {
    message: "Using cached version info",
    cachedVersionInfo: Sg
  }), Sg;
  return J.debug("jetbrains-plugin-version", {
    message: "Fetching version info",
    url: IgT
  }), Sg = await (await HQ(IgT)).json(), Sg;
}