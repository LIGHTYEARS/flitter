function iuT(T, R) {
  if (T === "tool.call" || T === "tool.result") return `${T}#${R.toolUseID}`;
  return T;
}
function cuT(T) {
  if (!T || typeof T !== "object") return;
  let R = T.thread;
  if (!R || typeof R !== "object") return;
  let a = R.id;
  return typeof a === "string" ? a : void 0;
}
function ZC(T, R, a, e, t) {
  let r = e ? `[${a}:${e}]` : `[${a}]`;
  return {
    log(...h) {
      let i = `${r} ${String(h[0] ?? "")}${h.length > 1 ? " " + h.slice(1).map(String).join(" ") : ""}`;
      if (R.info(i), t) T.request("span.event", {
        span: t,
        message: i
      });
    }
  };
}