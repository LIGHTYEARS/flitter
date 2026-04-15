function SBR(T, R, a) {
  J.debug("REPL: Spawning process", {
    binary: T,
    args: R,
    cwd: a
  });
  let e = jBR(T, R, {
      cwd: a,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...globalThis.process.env
      }
    }),
    t = [],
    r = [],
    h = [],
    i = [],
    c = !1;
  return e.on("spawn", () => {
    c = !0;
    for (let s of i) s();
  }), e.on("error", s => {
    for (let A of h) A(s);
  }), e.stdout?.on("data", s => {
    let A = s.toString();
    for (let l of t) l(A);
  }), e.stderr?.on("data", s => {
    let A = s.toString();
    for (let l of t) l(A);
  }), e.on("exit", s => {
    for (let A of r) A({
      exitCode: s
    });
  }), e.stdin?.on("error", s => {
    J.debug("REPL stdin error", {
      error: s.message
    });
    for (let A of h) A(s);
  }), {
    write: s => {
      if (e.stdin?.writable) try {
        return e.stdin.write(s);
      } catch (A) {
        return J.debug("REPL write error", {
          error: A
        }), !1;
      }
      return !1;
    },
    kill: s => {
      if (!e.killed) e.kill(s ?? "SIGTERM");
    },
    onData: s => t.push(s),
    onExit: s => r.push(s),
    onError: s => {
      h.push(s);
    },
    onReady: s => {
      if (c) s();else i.push(s);
    }
  };
}