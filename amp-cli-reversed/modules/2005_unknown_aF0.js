async function aF0() {
  pc0();
  let T = TF0(process.argv),
    R = RF0(process.argv, T),
    a = xc0(R),
    e = process.argv.includes("--no-color"),
    t = process.argv.includes("--color"),
    r = process.stdout.isTTY && process.stderr.isTTY;
  if (e || !t && !r) oR.level = 0;
  if (Lz0(J), J.info("Starting Amp CLI.", {
    version: "0.0.1775894934-g5bb49b",
    buildTimestamp: "2026-04-11T08:12:39.144Z"
  }), parseInt(process.version.slice(1).split(".")[0] ?? "") < 20) throw new GR(V3.nodeVersion(process.version), 1, "Please upgrade your Node.js installation from https://nodejs.org");
  if (process.argv.includes("--neo")) {
    await mC0();
    return;
  }
  await Yz0(a).parseAsync(process.argv);
}