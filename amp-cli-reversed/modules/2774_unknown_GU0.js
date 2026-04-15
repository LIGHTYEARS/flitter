async function GU0(T) {
  try {
    let R = ys.join("/tmp", `amp-thread-${T.thread.id}-${Date.now()}.yaml`),
      a = MRR.default.stringify(T.thread);
    await ZP(R, a, "utf-8"), await Zb(R), J.info("Thread YAML written and opened in editor", {
      file: R
    });
    return;
  } catch (R) {
    return J.error("Failed to write thread YAML or open editor", R), Error("Failed to write thread YAML or open editor", {
      cause: R
    });
  }
}