async function MXT(T, R) {
  if (P8.buffer.length = 0, P8.stream && !P8.takenOver) {
    try {
      if (P8.stream.isTTY) P8.stream.setRawMode(!1);
      P8.stream.removeAllListeners("data"), P8.stream.destroy();
    } catch {}
    P8.stream = null;
  }
  let a = ek0({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((e, t) => {
    if (R) {
      let r = () => {
        a.close(), t(R.reason);
      };
      if (R.aborted) {
        r();
        return;
      } else R.addEventListener("abort", r, {
        once: !0
      });
    }
    a.on("SIGINT", () => {
      a.close(), t(Error("Interrupt received"));
    }), a.question(T, {
      signal: R
    }, r => {
      a.close(), e(r.trim());
    });
  });
}