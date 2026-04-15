async function ZP0(T) {
  return (await kH(T.threadId, T.threadService)).archived === !0;
}
async function JP0(T, R) {
  if (!Ne.stdin.isTTY || !Ne.stdout.isTTY) throw new GR("live-sync needs an interactive terminal to resume after the 4h pause. Rerun the command to continue.", 1);
  let a = py0({
      input: Ne.stdin,
      output: Ne.stdout
    }),
    e = Uw(T, Ne.stdout);
  return await new Promise(t => {
    let r = !1,
      h = c => {
        if (r) return;
        if (r = !0, R) R.removeEventListener("abort", i);
        a.close(), t(c);
      },
      i = () => {
        h(!1);
      };
    if (R?.aborted) {
      h(!1);
      return;
    }
    if (R) R.addEventListener("abort", i, {
      once: !0
    });
    a.on("SIGINT", () => {
      h(!1);
    }), a.question(e, () => {
      h(!0);
    });
  });
}