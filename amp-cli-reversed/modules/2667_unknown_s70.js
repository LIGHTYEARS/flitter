function c70() {
  let T = process.env.XDG_CONFIG_HOME || pB.join(KJT.homedir(), ".config");
  return pB.join(T, "amp", "themes");
}
async function s70() {
  let T = c70();
  if (!Rx.existsSync(T)) return [];
  let R = [],
    a;
  try {
    a = await Rx.promises.readdir(T, {
      withFileTypes: !0
    });
  } catch (e) {
    return J.warn("Failed to read custom themes directory", {
      themesDir: T,
      error: e
    }), [];
  }
  for (let e of a) {
    if (!e.isDirectory()) continue;
    let t = pB.join(T, e.name, "colors.toml");
    if (!Rx.existsSync(t)) continue;
    try {
      let r = await o70(t, e.name);
      R.push(r);
    } catch (r) {
      J.warn("Failed to load custom theme", {
        dir: e.name,
        error: r
      });
    }
  }
  return R;
}