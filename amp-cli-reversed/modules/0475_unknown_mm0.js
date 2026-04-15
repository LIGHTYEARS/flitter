async function mm0(T) {
  let R = void 0,
    {
      flushProgressLine: a,
      renderProgress: e
    } = bm0(Xi);
  if (process.env.AMP_SKIP_UPDATE_CHECK === "1") Xi.write(oR.yellow(`Note: AMP_SKIP_UPDATE_CHECK=1 is set, which disables automatic update checking. Manual updates will still work.

`));
  try {
    if (!T) {
      Xi.write(oR.blue(`Checking for updates...
`));
      let {
        hasUpdate: h,
        latestVersion: i
      } = MVT() ? await FVT("0.0.1775894934-g5bb49b") : await zVT("0.0.1775894934-g5bb49b", fH());
      if (!h) {
        let c = pxT("0.0.1775894934-g5bb49b"),
          s = c?.age ? `released ${c.age} ago` : `built ${OO(new Date("2026-04-11T08:12:39.144Z"))} ago`;
        Xi.write(oR.green(`\u2713 Amp is already up to date on version ${"0.0.1775894934-g5bb49b"} (${s})
`));
        let A = await Ew("0.0.1775894934-g5bb49b", R);
        if (A.warning) Xi.write(`
` + oR.yellow(A.warning) + `
`);
        process.exit(0);
      }
      if (!i) Xi.write(oR.yellow("[WARN] could not find latest version")), process.exit(0);
      T = i;
    }
    Xi.write(oR.blue(`Updating to version ${T}...
`)), await qVT(T, void 0, h => {
      a(), Xi.write(oR.dim(`Running: ${h}
`));
    }, e), a();
    let t = pxT(T);
    Xi.write(oR.green(`\u2713 Amp updated to version ${T}${t ? ` (released ${t.age} ago)` : ""}
`));
    let r = await Ew(T);
    if (r.warning) Xi.write(`
` + oR.yellow(r.warning) + `
`);
    process.exit(0);
  } catch (t) {
    a();
    let r = t instanceof Error ? t.message : String(t);
    Xi.write(oR.red.bold("Error: ") + r + `
`), process.exit(1);
  }
}