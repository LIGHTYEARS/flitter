function OIT(T) {
  if (!T.isTTY) return {
    update: () => {},
    stop: () => {}
  };
  let R = ["|", "/", "-", "\\"],
    a = 0,
    e = "Starting review...",
    t = 0,
    r = setInterval(() => {
      let h = `${e} ${R[a]}`,
        i = t > h.length ? " ".repeat(t - h.length) : "";
      T.write(`\r${oR.dim(h)}${i}`), t = h.length, a = (a + 1) % R.length;
    }, 80);
  return {
    update: h => {
      e = h || e;
    },
    stop: () => {
      clearInterval(r), T.write(`\r${" ".repeat(t)}\r`);
    }
  };
}