function BVT() {
  if (process.env.AMP_HOME) return process.env.AMP_HOME;
  let T = wb0();
  if (!T) throw Error("Cannot determine home directory");
  return mS(T, ".amp");
}
function sxT(T) {
  Lb0(T, {
    recursive: !0,
    mode: 448
  }), wVT(T, 448);
}
function Wb0() {
  try {
    return Eb0("sysctl -a 2>/dev/null", {
      encoding: "utf8"
    }).includes("AVX2");
  } catch {}
  return !1;
}
function qb0() {
  let {
    platform: T,
    arch: R
  } = process;
  if (T === "darwin") {
    if (R === "arm64") return "darwin-arm64";
    return "darwin-x64";
  }
  if (T === "win32") return "windows-x64";
  if (T === "linux") {
    if (R === "arm64") return "linux-arm64";
    return Wb0() ? "linux-x64" : "linux-x64-baseline";
  }
  return "linux-x64";
}