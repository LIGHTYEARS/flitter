function ji() {
  return process.env.TERMINAL_EMULATOR?.includes("JetBrains") ?? !1;
}
function ob0() {
  return process.env.TERM_PROGRAM !== void 0 && process.env.TERM_PROGRAM === "vscode";
}
function nb0() {
  return process.env.NVIM !== void 0;
}
function ub0() {
  return !1;
}
function yA(T) {
  let R = EVT.homedir();
  if (T.startsWith(R)) return T.replace(R, "~");
  return T;
}
async function CVT() {
  let T = process.env.PATH || "",
    R = ub0(),
    a = T.split(":").filter(r => r.trim()),
    e = !1,
    t = a.flatMap(r => {
      if (e) return [lF(r, "amp.bat"), lF(r, "amp.exe")];else return [lF(r, "amp")];
    });
  return (await Promise.all(t.map(async r => {
    try {
      let h = e ? txT.F_OK : txT.X_OK;
      return await mb0(r, h), r;
    } catch {
      return null;
    }
  }))).filter(r => r !== null);
}