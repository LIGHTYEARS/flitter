function az(T) {
  T.setRawMode(!0), T.on("data", a => {
    P8.buffer.push(Buffer.from(a));
  }), P8.stream = T;
  let R = () => {
    if (P8.takenOver) return;
    let a = P8.stream;
    if (!a) return;
    try {
      if (a.isTTY) a.setRawMode(!1);
    } catch {}
    try {
      a.removeAllListeners("data"), a.destroy();
    } catch {}
    P8.stream = null;
  };
  process.once("exit", R), process.once("SIGINT", R), process.once("SIGTERM", R);
}