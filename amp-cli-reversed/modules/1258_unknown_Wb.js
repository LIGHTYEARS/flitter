function zmT(T) {
  if (T.startsWith("file://")) return zR.parse(T).fsPath;
  return T;
}
async function Wb(T, R) {
  try {
    let a = VUR(),
      e = {
        timeout: 5000,
        signal: R
      };
    switch (a) {
      case "win32":
        await tz(`start "" "${T}"`, e);
        break;
      case "darwin":
        await tz(`open "${T}"`, e);
        break;
      default:
        await tz(`xdg-open "${T}"`, e);
        break;
    }
    J.info("Opened browser with auth URL", {
      url: T
    });
  } catch (a) {
    throw J.error("Failed to open browser", {
      error: a
    }), a;
  }
}