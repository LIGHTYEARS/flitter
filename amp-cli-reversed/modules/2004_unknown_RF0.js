function RF0(T, R) {
  let a = T.includes("--headless") || T.some(t => t.startsWith("--headless=")),
    e = AA.resolve(R.logFile ?? process.env.AMP_LOG_FILE ?? (a ? Ez0 : aKT));
  return {
    logLevel: R.logLevel ?? process.env.AMP_LOG_LEVEL ?? "info",
    logFile: e
  };
}