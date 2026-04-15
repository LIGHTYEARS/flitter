async function FU0(T) {
  try {
    let R = ys.join("/tmp", `amp-thread-${T.thread.id}-${Date.now()}.json`),
      a = JSON.stringify(T.thread, null, 2);
    await ZP(R, a, "utf-8"), await Zb(R), J.info("Thread JSON written and opened in editor", {
      file: R
    });
    return;
  } catch (R) {
    return J.error("Failed to write thread JSON or open editor", R), Error("Failed to write thread JSON or open editor", {
      cause: R
    });
  }
}