function FzR() {
  return fzT() ?? process.env.SHELL ?? "/bin/sh";
}
function GzR(T) {
  return /\bgit(\.exe)?\b/.test(T);
}
function KzR(T) {
  let R = wuT.get(T);
  if (!R) R = new Cm(), wuT.set(T, R);
  return R;
}
function VzR(T, R) {
  if (typeof R.timeout_ms === "number" && Number.isFinite(R.timeout_ms) && R.timeout_ms > 0) return Math.floor(R.timeout_ms);
  return SnR(T);
}
function XzR(T, R, a, e, t, r) {
  let h = VzR(R, a),
    i = h !== null,
    c = GzR(a.cmd),
    s = c ? qU(T) ?? T : void 0;
  return new AR(A => {
    let l = rzT(),
      o = WzR(),
      n = !1,
      p = !1,
      _ = !1,
      m,
      b,
      y,
      u,
      P,
      k,
      x,
      f,
      v,
      g = Date.now(),
      I,
      S = new W0(),
      O = {
        stdout: "",
        stderr: "",
        combinedOutput: "",
        exitCode: null,
        exited: !1
      };
    function j() {
      if (_) return;
      if (_ = !0, I) clearTimeout(I), I = void 0;
      b?.unsubscribe(), y?.unsubscribe(), u?.unsubscribe(), S.complete(), l.dispose(), k?.(), k = void 0;
    }
    u = S.pipe(D$(({
      lastData: w,
      exited: D
    }) => gh(new Promise(B => {
      if (n || p) {
        B({
          status: "cancelled",
          reason: r
        });
        return;
      }
      l.write(w ?? new Uint8Array(), () => {
        if (D) {
          B({
            status: "done",
            result: {
              ...o.finish(),
              exitCode: v ? -1 : x ?? -1,
              ...(v ?? {})
            },
            reason: r
          });
          return;
        }
        B({
          status: "in-progress",
          progress: hzT(l),
          reason: r
        });
      });
    })))).subscribe({
      next: w => {
        if (n || p || w.status === "cancelled") return;
        if (w.status === "done") p = !0;
        if (A.next(w), w.status === "done") A.complete(), j();
      },
      error: w => {
        if (n || p) return;
        j(), A.error(w);
      }
    });
    function d() {
      S.next({
        ...O
      });
    }
    function C(w) {
      if (f || p) return;
      if (f = w, I) clearTimeout(I), I = void 0;
      let D = Math.round((Date.now() - g) / 1000);
      if (v = {
        stopCode: w,
        stopReason: w === "user-stop" ? `Command stopped by user after ${D} seconds` : `Command timed out after ${D} seconds of inactivity`
      }, !P || !m) {
        O.exited = !0, O.lastData = void 0, d();
        return;
      }
      J.info(`Stopping bash command (${w}) with PID:`, m);
      try {
        if (P.kill && m) P.kill("SIGTERM"), setTimeout(() => {
          if (P && P.kill && !P.killed) try {
            process.kill(-m, "SIGKILL");
          } catch (B) {
            P.kill("SIGKILL");
          }
        }, 1000);
      } catch (B) {
        J.warn("Error stopping process:", B);
      }
    }
    function L() {
      if (!i || !h) return;
      if (I) clearTimeout(I);
      I = setTimeout(() => C("inactivity-timeout"), h);
    }
    if (e) J.info("Setting up tool message subscription for bash command"), b = e.subscribe(w => {
      if (J.info("Received tool message:", w.type), w.type === "stop-command") C("user-stop");
    });
    return (async () => {
      try {
        L();
        let w = await m0(hDT(T, R.settings["terminal.commands.nodeSpawn.loadProfile"], t));
        if (n) {
          j();
          return;
        }
        if (c && s) {
          let V = KzR(s);
          if (await V.acquire(), k = () => V.release(), n) {
            j();
            return;
          }
        }
        if (f) {
          O.exited = !0, O.lastData = void 0, d();
          return;
        }
        let D = c ? {
            ...w,
            GIT_OPTIONAL_LOCKS: "0"
          } : w,
          B = t.userInitiated ? FzR() : zzR(),
          M = typeof B === "string" && /\/(bash|zsh|ksh)$/.test(B) ? `set -o pipefail; ${a.cmd}` : a.cmd;
        y = i4T(M, [], {
          shell: B,
          cwd: T,
          stdio: ["ignore", "pipe", "pipe"],
          env: D
        }).subscribe({
          next: V => {
            if (n || p) return;
            switch (V.type) {
              case "spawn":
                if (m = V.pid, P = V.process, O.pid = V.pid, O.process = V.process, O.lastData = void 0, L(), d(), f) C(f);
                break;
              case "data":
                {
                  o.append(V.chunk);
                  let Q = V.chunk.toString();
                  if (V.stream === "stdout") O.stdout += Q;else O.stderr += Q;
                  O.combinedOutput += Q, O.lastData = V.chunk, O.exited = !1, L(), d();
                  break;
                }
              case "exit":
                x = V.exitCode ?? -1, O.exitCode = x, O.exited = !0;
                break;
              case "close":
                if (x === void 0) x = V.exitCode ?? -1, O.exitCode = x;
                if (I) clearTimeout(I), I = void 0;
                O.exited = !0, O.lastData = void 0, d();
                break;
            }
          },
          error: V => {
            if (n || p) return;
            j(), A.error(V);
          }
        });
      } catch (w) {
        if (n || p) {
          j();
          return;
        }
        j(), A.error(w);
      }
    })(), () => {
      n = !0, j();
    };
  });
}