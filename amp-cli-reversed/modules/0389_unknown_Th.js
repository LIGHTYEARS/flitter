function Th(T, R, a) {
  if (J.info("[headless-dtw] websocket message", {
    direction: T,
    clientId: R,
    ...(typeof a === "object" && a !== null ? a : {
      message: a
    })
  }), !htT) return;
  let e = oR.dim(`[${rtT()}]`),
    t = oR.magenta(`[${R}]`),
    r = T === "SEND" ? oR.green(">>>") : oR.yellow("<<<"),
    h = itT(a);
  process.stderr.write(`${e} ${t} ${r} ${h}
`);
}