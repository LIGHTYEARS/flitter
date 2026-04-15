function yd0(T) {
  let R = process.env.PAGER || "less",
    a = G4.mkdtempSync(RQ.join(td0.tmpdir(), "amp-pager-")),
    e = RQ.join(a, "output.txt");
  try {
    d9.instance.tuiInstance.suspend(), G4.writeFileSync(e, T, "utf-8");
    let [t = R, ...r] = R.split(" ");
    LQT(t, [...r, e], {
      stdio: "inherit",
      env: {
        ...process.env,
        LESS: "-X -c"
      }
    });
  } catch (t) {
    J.error("Failed to open pager", {
      pager: R,
      error: t
    });
  } finally {
    process.stdout.write("\x1B[2J\x1B[H\x1B[?25l"), d9.instance.tuiInstance.resume();
    try {
      G4.unlinkSync(e), G4.rmdirSync(a);
    } catch {}
  }
}