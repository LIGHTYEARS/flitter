async function Ib0(T) {
  for (let R of T.configPaths) {
    let a = yA(R);
    if (dVT(R)) try {
      return rt.blue(`[INFO] Adding PATH to "${a}"`), await Ab0(R, `
# amp
` + T.command + `
`, {
        flag: "a"
      }), rt.green(`\u2713 Added "~/.local/bin" to PATH in "${a}"`), !0;
    } catch (e) {
      rt.red(`[WARN] Failed to update ${a}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return !1;
}