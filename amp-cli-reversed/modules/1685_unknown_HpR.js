async function HpR(T, R, a, e, t, r) {
  let h = {
    AGENT: "amp"
  };
  if (e) h.AMP_THREAD_ID = e;
  if (t) h.AGENT_TOOL_NAME = t;
  if (r) h.AGENT_TOOL_USE_ID = r;
  let i = T.includes("~") || T.includes("%") ? h4T(T).path : T,
    c = a(i, [], {
      env: h
    });
  return new Promise((s, A) => {
    let l;
    c.subscribe({
      next: o => {
        if (typeof o === "object" && o !== null && "status" in o && o.status === "error") {
          A(Error("Delegate command timed out after 10 seconds"));
          return;
        }
        if (o.process && !o.exited) o.process.stdin?.write(JSON.stringify(R)), o.process.stdin?.end();
        l = o;
      },
      complete: () => {
        if (l?.exited) s({
          exitCode: l.exitCode ?? -1,
          stdout: l.stdout,
          stderr: l.stderr
        });else A(Error("Process did not exit properly"));
      },
      error: o => {
        A(o);
      }
    });
  });
}