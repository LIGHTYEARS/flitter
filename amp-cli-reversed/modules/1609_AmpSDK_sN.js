function Vs(T) {
  if (!T) return {};
  return {
    [VET]: T.id,
    [FlR]: T.agentMode ?? ""
  };
}
function YlR(T) {
  XET = T;
}
function Mg(T) {
  Dg = T;
}
function QlR(T) {
  YET = T;
}
function ZlR(T) {
  $j = T.installationID, vj = T.deviceFingerprint;
}
function JlR() {
  if (!$j || !vj) return;
  return {
    installationID: $j,
    deviceFingerprint: vj
  };
}
function sN() {
  let T = typeof process < "u" ? process.env.AMP_SDK_VERSION : void 0;
  if (T) return {
    type: "cli",
    name: "AmpSDK",
    version: T
  };
  let R;
  if (!Dg) R = "CLI";else if (["Neovim", "JetBrains", "Zed"].includes(Dg)) R = Dg;else R = `${Dg} CLI`;
  return {
    type: "cli",
    name: YET ? `${R} Execute Mode` : R,
    version: XET
  };
}