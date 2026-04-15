function Pb0() {
  let T = process.env.AMP_HOME;
  if (!T) return {
    ripgrepTargetDir: null,
    installLocalBin: !1,
    checkVersion: !0
  };
  let R = mh.join(T, "bin"),
    a = mh.join(H_.homedir(), ".amp");
  if (T !== a) return rt.blue("[INFO] Custom AMP_HOME detected - skipping installation of ~/.local/bin/amp (assuming testing mode)"), {
    ripgrepTargetDir: R,
    installLocalBin: !1,
    checkVersion: !1
  };
  return {
    ripgrepTargetDir: R,
    installLocalBin: !0,
    checkVersion: !0
  };
}