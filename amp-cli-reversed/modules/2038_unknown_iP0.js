function iP0(T) {
  let R = !1,
    a = [],
    e = (h, i) => {
      if (T.onWriteLine) {
        T.onWriteLine(h, i);
        return;
      }
      if (h === "stdout") {
        GP(T.stdout, i);
        return;
      }
      GP(T.stderr, i);
    },
    t = (h, i) => {
      if (R) {
        a.push({
          stream: h,
          message: i
        });
        return;
      }
      e(h, i);
    },
    r = () => {
      for (let h of a) e(h.stream, h.message);
      a.length = 0;
    };
  return {
    writeStdoutLine: h => {
      t("stdout", h);
    },
    writeStderrLine: h => {
      t("stderr", h);
    },
    runWithPromptBuffer: async h => {
      R = !0, T.onPromptStart?.();
      try {
        return await h();
      } finally {
        R = !1, T.onPromptEnd?.(), r();
      }
    }
  };
}