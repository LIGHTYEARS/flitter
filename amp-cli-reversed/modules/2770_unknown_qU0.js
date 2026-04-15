async function qU0(T, R) {
  let a = [];
  for (let [e, t] of R.entries()) {
    if (t.source.type !== "base64") {
      J.warn("Skipping non-base64 debug package issue image", {
        index: e,
        sourceType: t.source.type
      });
      continue;
    }
    let r = `issue-image-${e + 1}${HU0(t)}`,
      h = ys.join(T, r);
    try {
      await ZP(h, Buffer.from(t.source.data, "base64")), a.push(r);
    } catch (i) {
      J.warn("Failed to write debug package issue image", {
        index: e,
        fileName: r,
        error: i
      });
    }
  }
  return a;
}