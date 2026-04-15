async function OtT(T) {
  let R = process.stdout,
    a,
    e = !1;
  if (P8.stream && !P8.takenOver) a = P8.stream, a.removeAllListeners("data"), P8.buffer.length = 0, P8.takenOver = !0, e = !0;else if (process.stdin.isTTY) a = process.stdin;else try {
    let t = (await MXT(T)).toLocaleLowerCase();
    return t === "y" || t === "yes";
  } catch (t) {
    if (t instanceof Error && t.message === "Interrupt received") return !1;
    throw t;
  }
  return R.write(T), new Promise(t => {
    a.setRawMode(!0), a.resume(), a.setEncoding("utf8");
    let r = () => {
        if (a.setRawMode(!1), a.removeListener("data", h), e) a.destroy(), P8.stream = null;else a.pause();
      },
      h = i => {
        if (r(), i === "\x03") {
          R.write(`
`), t(!1);
          return;
        }
        let c = i.toLowerCase();
        R.write(c + `
`), t(c === "y");
      };
    a.on("data", h);
  });
}