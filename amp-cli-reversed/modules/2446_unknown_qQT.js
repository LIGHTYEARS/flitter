function vd0(T, R, a) {
  return new nrT({
    title: T.label,
    subtitle: T.description,
    selected: R,
    onTap: a,
    enabled: T.enabled ?? !0
  });
}
function Cd0() {
  if (Ed0() === "linux") {
    let T = process.env.XDG_DOWNLOAD_DIR;
    if (T && T.trim()) return T;
  }
  return eQ.join(dd0(), "Downloads");
}
async function Ld0(T) {
  try {
    return await Od0(T), !0;
  } catch {
    return !1;
  }
}
async function qQT(T) {
  let R = eQ.basename(T),
    a = Cd0();
  try {
    await Sd0(a, {
      recursive: !0
    });
    let e = eQ.join(a, R);
    if (await Ld0(e)) return {
      success: !0,
      destPath: e
    };
    return await jd0(T, e), {
      success: !0,
      destPath: e
    };
  } catch (e) {
    return J.error("Failed to download image", {
      error: e
    }), {
      success: !1,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}