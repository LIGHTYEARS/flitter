function SP0(T) {
  if (T >= Yy0) return "Connecting... Waiting for the executor filesystem";
  return "Connecting...";
}
function Ji(T) {
  return T ? T.slice(0, 7) : "unknown";
}
function OP0(T) {
  let R = RA(T.stdout),
    a = !1,
    e = null,
    t = null,
    r = null;
  if (RA(T.stdout)) {
    for (let A of dP0({
      threadId: T.threadId,
      threadTitle: T.threadTitle,
      repoRoot: T.repoRoot,
      output: T.stdout
    })) GP(T.stdout, A);
    GP(T.stdout, "");
  }
  let h = (A, l) => {
      let o = A === "stdout" ? T.stdout : T.stderr,
        n = MP0(l);
      if (n.trim().length > 0) {
        let p = {
          threadId: T.threadId,
          repoRoot: T.repoRoot,
          stream: A,
          liveSyncMessage: n
        };
        if (A === "stderr") J.warn("Live sync output", p);else J.info("Live sync output", p);
      }
      s(), GP(o, Nw(n, o));
    },
    i = () => {
      if (r !== null) clearInterval(r), r = null;
      t = null;
    },
    c = () => {
      if (!R || !e) return;
      t ??= new xa();
      let A = LP0(`${t.toBraille()} ${e}`, T.stdout),
        l = Nw(A, T.stdout);
      T.stdout.write(`\r\x1B[2K${l}`), a = !0;
    },
    s = () => {
      if (!R) return;
      if (i(), e = null, !a) return;
      T.stdout.write("\r\x1B[2K"), a = !1;
    };
  return {
    writeLine: (A, l) => {
      h(A, l);
    },
    setTransientStatus: A => {
      if (!R) return;
      if (e = A, c(), r !== null) return;
      r = setInterval(() => {
        t?.step(), c();
      }, T.transientSpinnerIntervalMs ?? Xy0);
    },
    clearTransientStatus: s,
    onPromptStart: () => {
      s();
    },
    onPromptEnd: () => {},
    dispose: () => {
      s();
    }
  };
}