async function gb0(T, R, a) {
  let e = Pb0();
  if (e.ripgrepTargetDir) await kb0(e.ripgrepTargetDir, T, R);
  if (e.installLocalBin) await xb0();
  let t = !1;
  if (e.checkVersion) {
    let r = await Ew(a);
    if (R) rt.blue(`[INFO] "amp --version" state is ${r.status}`);
    if (r.warning) rt.yellow(r.warning);
    t = r.status === "missing";
  }
  if (t && e.installLocalBin) await fb0();
}