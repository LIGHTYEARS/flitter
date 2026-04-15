async function sy0(T = {}) {
  let R = eXT(),
    a = new $H(),
    e = new ktT(),
    t = hy0(),
    r = Xb(),
    h = r ? {
      clientTermFeatures: cy0(),
      extendedKeysFormat: MxT("extended-keys-format"),
      extendedKeysMode: MxT("extended-keys")
    } : null,
    i = h?.clientTermFeatures?.includes("extkeys") ?? !1;
  if (T.raw) L3({
    type: "debug",
    controlTarget: t.target,
    platform: "darwin",
    stdoutIsTTY: process.stdout.isTTY,
    stderrIsTTY: process.stderr.isTTY,
    term: process.env.TERM ?? null,
    termProgram: process.env.TERM_PROGRAM ?? null,
    termProgramVersion: process.env.TERM_PROGRAM_VERSION ?? null,
    tmux: r,
    tmuxClientTermFeatures: h?.clientTermFeatures ?? null,
    tmuxExtendedKeys: r ? i : null,
    tmuxExtendedKeysFormat: h?.extendedKeysFormat ?? null,
    tmuxExtendedKeysMode: h?.extendedKeysMode ?? null
  });
  let c = !1,
    s = null,
    A = null,
    l = !1,
    o = !1,
    n = () => {
      L3({
        type: "signal",
        signal: "SIGWINCH",
        stdout: LxT()
      });
    },
    p = () => {
      L3({
        type: "stdout_resize",
        stdout: LxT()
      });
    },
    _ = new Promise(I => {
      s = I;
    }),
    m = () => {
      if (!A) return null;
      let I = A;
      A = null, clearTimeout(I.timeout);
      let S = {
        stage: I.stage,
        kittyQueryResponse: I.kittyQueryResponse,
        deviceAttributes: I.deviceAttributes
      };
      return L3({
        type: "startup_probe",
        stage: S.stage,
        timeoutMs: CxT,
        kittyQueryResponse: S.kittyQueryResponse,
        deviceAttributes: S.deviceAttributes
      }), I.resolve(S), S;
    },
    b = I => {
      if (!A || I.request !== "u") return;
      if (A.kittyQueryResponse = I.response, A.deviceAttributes !== null) m();
    },
    y = I => {
      if (!A) return;
      if (A.deviceAttributes = {
        primary: I.primary,
        secondary: [...I.secondary]
      }, A.kittyQueryResponse !== null) m();
    },
    u = I => {
      if (A) m();
      return new Promise(S => {
        A = {
          stage: I,
          kittyQueryResponse: null,
          deviceAttributes: null,
          resolve: S,
          timeout: setTimeout(() => {
            m();
          }, CxT)
        }, Rh(t, ey0, "kitty-query", T, I), Rh(t, Ty0, "device-attributes-query", T, I);
      });
    },
    P = () => {
      if (c) return;
      if (c = !0, o) process.off("SIGWINCH", n);
      if (process.stdout.isTTY) process.stdout.off("resize", p);
      process.off("SIGINT", x), process.off("SIGTERM", f), process.off("exit", P), m();
      try {
        if (l) Rh(t, ry0, "win32-input-mode-disable", T);
        if (Rh(t, ay0, "focus-disable", T), Rh(t, e.disableInBandResize(), "inband-resize-disable", T), Rh(t, e.disableBracketedPaste(), "bracketed-paste-disable", T), r) Rh(t, e.disableModifyOtherKeys(), "tmux-extended-keys-disable", T);
        Rh(t, e.disableKittyKeyboard(), "kitty-keyboard-disable", T);
      } catch {}
      t.dispose(), R.dispose();
    },
    k = I => {
      if (c) return;
      process.exitCode = I, P(), s?.();
    },
    x = () => {
      k(130);
    },
    f = () => {
      k(143);
    };
  process.once("SIGINT", x), process.once("SIGTERM", f), process.once("exit", P);
  try {
    process.on("SIGWINCH", n), o = !0;
  } catch (I) {
    L3({
      type: "signal_subscription_error",
      signal: "SIGWINCH",
      error: I instanceof Error ? I.message : String(I)
    });
  }
  if (process.stdout.isTTY) process.stdout.on("resize", p);
  a.onKey(I => {
    let S = {
      type: "key",
      key: I.key,
      code: I.code ?? null,
      modifiers: {
        shift: I.shiftKey,
        ctrl: I.ctrlKey,
        alt: I.altKey,
        meta: I.metaKey
      },
      eventType: I.eventType ?? null
    };
    if (iy0(I)) {
      L3(S, () => k(0));
      return;
    }
    L3(S);
  }), a.onDcs(I => {
    L3(I);
  }), a.onOsc(I => {
    L3(I);
  }), a.onApc(I => {
    L3(I);
  }), a.onPaste(I => {
    L3(I);
  }), a.onSgrMouse(I => {
    L3(I);
  }), a.onFocus(I => {
    L3(I);
  }), a.onMouse(I => {
    L3(I);
  }), a.onResize(I => {
    L3(I);
  }), a.onColorPaletteChange(I => {
    L3(I);
  }), a.onCursorPositionReport(I => {
    L3(I);
  }), a.onDeviceAttributes(I => {
    y(I), L3(I);
  }), a.onDecrqss(I => {
    if (b(I), I.request === "u") {
      L3({
        type: "kitty_query_response",
        response: I.response
      });
      return;
    }
    L3(I);
  }), R.on("data", I => {
    if (T.raw) L3({
      type: "raw",
      bytes: Buffer.from(I).toString("hex"),
      escaped: bY(I)
    });
    a.parse(I);
  });
  let v = [...R.earlyInputBuffer];
  R.earlyInputBuffer.length = 0;
  for (let I of v) {
    if (T.raw) L3({
      type: "raw",
      bytes: I.toString("hex"),
      escaped: bY(I)
    });
    a.parse(I);
  }
  await u("before_enable"), Rh(t, Ry0, "focus-enable", T), Rh(t, e.enableInBandResize(), "inband-resize-enable", T), Rh(t, e.enableBracketedPaste(), "bracketed-paste-enable", T), Rh(t, e.enableKittyKeyboard({
    reportEventTypes: !0
  }), "kitty-keyboard-enable", T);
  let g = await u("after_enable");
  if (r) L3({
    type: "tmux_info",
    extendedKeysFormat: h?.extendedKeysFormat ?? null,
    extendedKeysMode: h?.extendedKeysMode ?? null,
    hasExtkeysFeature: i,
    note: "tmux does not proxy kitty query/event-type support; enabling modifyOtherKeys mode 2 for press-only extended keys"
  }), Rh(t, ty0, "tmux-extended-keys-enable", T);
  await _;
}