async function je(T, R, a) {
  R = typeof R === "string" ? R : R.toString();
  try {
    let e = ZQT(R);
    if (e) {
      if (!(await JQT(e.fileURI))) throw Error(`File does not exist: ${R}`);
      await RE0(e, a);
    } else await Wb(R);
    return !0;
  } catch (e) {
    J.error("Failed to open link", {
      uri: R,
      error: e
    });
    let t = await TE0(R, e);
    return cb.error(T, t), !1;
  }
}