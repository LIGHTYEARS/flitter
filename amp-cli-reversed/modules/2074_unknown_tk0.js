async function tk0(T, R = 10) {
  J.info("Finding available port", {
    startPort: T
  });
  for (let a = 0; a < R; a++) {
    let e = T + a;
    try {
      return await new Promise((t, r) => {
        let h = EXT();
        h.once("error", i => {
          if (i.code === "EADDRINUSE") r(Error(`Port ${e} is in use`));else r(i);
        }), h.once("listening", () => {
          h.close(() => t());
        }), h.listen(e, "127.0.0.1");
      }), J.info("Found available port", {
        port: e
      }), e;
    } catch (t) {
      J.info("Port in use", {
        port: e,
        nextPort: e + 1
      });
    }
  }
  throw Error(`Could not find an available port after ${R} attempts`);
}