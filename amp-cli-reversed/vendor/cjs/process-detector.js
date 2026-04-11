// Module: process-detector
// Original: WeR
// Type: CJS (RT wrapper)
// Exports: processDetector
// Category: util

// Module: weR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getMachineId = void 0));
  var R = qT("process"),
    a = lZ(),
    e = n0();
  async function t() {
    let r = "%windir%\\System32\\REG.exe";
    if (R.arch === "ia32" && "PROCESSOR_ARCHITEW6432" in R.env)
      r = "%windir%\\sysnative\\cmd.exe /c " + r;
    try {
      let h = (
        await (0, a.execAsync)(
          `${r} QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid`,
        )
      ).stdout.split("REG_SZ");
      if (h.length === 2) return h[1].trim();
    } catch (h) {
      e.diag.debug(`error reading machine id: ${h}`);
    }
    return;
  }
  T.getMachineId = t;
};
