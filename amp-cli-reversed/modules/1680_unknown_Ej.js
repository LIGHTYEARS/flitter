function Ej(...T) {
  return new AR(R => {
    let a = {
        stdout: "",
        stderr: "",
        combinedOutput: "",
        exitCode: null,
        exited: !1
      },
      e = i4T(...T).subscribe({
        next: t => {
          switch (t.type) {
            case "spawn":
              a.pid = t.pid, a.process = t.process, R.next({
                ...a,
                process: t.process
              });
              break;
            case "data":
              {
                let r = t.chunk.toString();
                if (t.stream === "stdout") a.stdout += r;else a.stderr += r;
                a.combinedOutput += r, a.lastData = t.chunk, R.next({
                  ...a,
                  process: t.process ?? a.process
                });
                break;
              }
            case "exit":
              a.exitCode = t.exitCode ?? -1, a.exited = !0;
              break;
            case "close":
              if (a.exitCode === null) a.exitCode = t.exitCode ?? -1;
              a.exited = !0, a.lastData = void 0, R.next({
                ...a,
                process: a.process
              }), R.complete();
              break;
          }
        },
        error: t => R.error(t)
      });
    return () => e.unsubscribe();
  });
}