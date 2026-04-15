function L5R(T, R, a = "json") {
  return (e, t) => {
    return new AR(r => {
      let h = {
          ...process.env,
          ...czT,
          TOOLBOX_ACTION: "execute",
          AGENT: "amp",
          AGENT_THREAD_ID: t.thread?.id || "",
          AMP_CURRENT_THREAD_ID: t.thread?.id || ""
        },
        i = R(T, [], {
          env: h,
          stdio: ["pipe", "pipe", "pipe"]
        }),
        c = rzT(),
        s = !1,
        A = i.pipe(D$(l => {
          if (J.debug("toolbox: received spawnResult", {
            executablePath: T,
            hasLastData: !!l.lastData,
            lastDataLength: l.lastData?.length,
            exited: l.exited,
            exitCode: l.exitCode,
            stdoutLength: l.stdout.length,
            stderrLength: l.stderr.length,
            hasPid: !!l.process?.pid
          }), l.process?.stdin && !s && !l.exited) {
            s = !0;
            let o = a === "text" ? j5R(e.args) : JSON.stringify(e.args);
            J.debug("toolbox: sending stdin data", {
              executablePath: T,
              format: a,
              inputData: o
            }), l.process.stdin.write(o), l.process.stdin.end();
          }
          return new AR(o => {
            let n = l.lastData?.subarray() ?? new Uint8Array();
            if (r.closed) {
              o.next({
                status: "cancelled"
              }), o.complete();
              return;
            }
            c.write(n, () => {
              let p = hzT(c);
              if (J.debug("toolbox: xterm content after write", {
                executablePath: T,
                outputLength: p.output.length,
                exited: l.exited
              }), l.exited) {
                let _ = p.output;
                J.debug("toolbox: emitting done", {
                  executablePath: T,
                  exitCode: l.exitCode,
                  outputLength: _.length
                }), o.next({
                  status: "done",
                  result: {
                    output: _,
                    truncation: p.truncation,
                    exitCode: l.exitCode ?? -1
                  }
                });
              } else J.debug("toolbox: emitting in-progress", {
                executablePath: T,
                outputLength: p.output.length,
                outputPreview: p.output.slice(0, 100)
              }), o.next({
                status: "in-progress",
                progress: p
              });
              o.complete();
            });
          });
        }), tN(() => {
          c.dispose();
        })).subscribe({
          next: l => r.next(l),
          error: l => {
            J.debug("Failed to execute toolbox", l), r.next({
              status: "error",
              error: {
                message: `Failed to execute toolbox: ${l}`
              }
            }), r.complete();
          },
          complete: () => r.complete()
        });
      return () => {
        A.unsubscribe();
      };
    });
  };
}