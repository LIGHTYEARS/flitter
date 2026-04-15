function QAR() {
  let T = ["zed", "zed-editor"];
  for (let R of T) if (fCT(R, ["--version"], {
    encoding: "utf-8"
  }).status === 0) return R;
  return null;
}
function ZAR() {
  let T = process.env[TpR];
  if (T) return T;
  return Rn.join(qiT.homedir(), "Library", "Application Support", "Zed");
}
function G0T(T) {
  let R = T.toLowerCase();
  return R.includes("intellij") || R.includes("webstorm") || R.includes("pycharm") || R.includes("goland") || R.includes("phpstorm") || R.includes("rubymine") || R.includes("clion") || R.includes("rider") || R.includes("datagrip") || R.includes("appcode") || R.includes("android studio") || R.includes("fleet") || R.includes("rustrover");
}