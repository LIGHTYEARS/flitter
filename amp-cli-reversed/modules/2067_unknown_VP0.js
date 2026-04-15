function GP(T, R) {
  T.write(`${R}
`);
}
function CM(T) {
  return T instanceof Error ? T.message : String(T);
}
function KP0() {
  return VP0() === "debug";
}
function VP0() {
  for (let R = 0; R < Ne.argv.length; R += 1) {
    let a = Ne.argv[R];
    if (!a) continue;
    if (a.startsWith("--log-level=")) {
      let t = a.slice(12).trim().toLowerCase();
      return t.length > 0 ? t : null;
    }
    if (a !== "--log-level") continue;
    let e = Ne.argv[R + 1]?.trim().toLowerCase();
    if (!e || e.startsWith("--")) return null;
    return e;
  }
  let T = Ne.env.AMP_LOG_LEVEL?.trim().toLowerCase();
  return T && T.length > 0 ? T : null;
}