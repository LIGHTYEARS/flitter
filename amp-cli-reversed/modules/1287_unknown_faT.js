async function faT() {
  if (process.env.AMP_RIPGREP_PATH) return J.debug("ripgrepExecutable: Using AMP_RIPGREP_PATH", {
    path: process.env.AMP_RIPGREP_PATH
  }), process.env.AMP_RIPGREP_PATH;
  if (await YHR()) return J.debug("ripgrepExecutable: Using system ripgrep"), HU;
  J.debug("ripgrepExecutable: System ripgrep not installed, downloading binary");
  let T = await FHR();
  if (T) return J.debug("ripgrepExecutable: Using downloaded ripgrep binary", {
    path: T
  }), T;
  throw J.warn("ripgrepExecutable: Neither system ripgrep nor downloaded binary available"), Error("ripgrep is not installed and could not be downloaded");
}