async function SwR(T, R) {
  await _wR(T, R, "utf8"), J.info("Created scaffold customization file", {
    file: T
  });
}
function MwR(T, R, a) {
  let e = a.getExecutionProfile(T.name),
    t = a.getExecutionProfile(R.name);
  if (!e || !t) return !0;
  if (e.serial || t.serial) return !0;
  let r = e.resourceKeys(T.input ?? {}),
    h = t.resourceKeys(R.input ?? {});
  for (let i of r) for (let c of h) if (i.key === c.key) {
    if (i.mode === "write" || c.mode === "write") return !0;
  }
  return !1;
}