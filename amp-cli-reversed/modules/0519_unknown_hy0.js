function hy0() {
  if (process.stdout.isTTY) return {
    stream: process.stdout,
    target: "stdout",
    dispose: () => {}
  };
  if (process.stderr.isTTY) return {
    stream: process.stderr,
    target: "stderr",
    dispose: () => {}
  };
  try {
    let T = um0("/dev/tty", "w");
    if (Pm0.isatty(T)) return {
      stream: {
        write(R) {
          return ym0(T, R), !0;
        }
      },
      target: "dev-tty",
      dispose: () => {
        _xT(T);
      }
    };
    _xT(T);
  } catch {}
  return {
    stream: process.stdout,
    target: "stdout",
    dispose: () => {}
  };
}