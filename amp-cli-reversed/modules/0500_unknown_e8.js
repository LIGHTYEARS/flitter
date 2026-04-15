function e8(T, ...R) {
  if (!T) {
    let a = R.join(" "),
      e = Error(a);
    J.error("TUI Assert failed", {
      assertion: a,
      stackTrace: e.stack,
      meta: R
    });
    let t = process.env.AMP_DEBUG,
      r = process.env.VITEST;
    if (t || r) {
      if (r) throw e;
      Km0(), console.error("FATAL TUI ERROR:", a), console.error("Stack trace:", e.stack), console.error("Context:", {
        meta: R
      }), process.exit(1);
    }
  }
}