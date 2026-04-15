function I5R(T, R) {
  return (a, e) => {
    return new AR(t => {
      let r = a.args;
      g5R(r.prompt, T, R, e).then(h => {
        h.subscribe({
          next: i => {
            if (i.status === "in-progress") {
              let c = i.turns.at(-1),
                s = c && "activeTools" in c && c.activeTools instanceof Map ? Array.from(c.activeTools.entries()).map(A => {
                  let [l, o] = A;
                  return {
                    id: l,
                    tool_name: o.tool_name,
                    status: o.status,
                    input: o.input,
                    result: o.result
                  };
                }) : [];
              t.next({
                status: "in-progress",
                progress: [{
                  message: c?.message || "Working...",
                  tool_uses: s
                }]
              });
            } else if (i.status === "done") t.next({
              status: "done",
              result: i.message
            }), t.complete();else if (i.status === "error") t.next({
              status: "error",
              error: {
                message: i.message
              }
            }), t.complete();
          },
          error: i => {
            t.next({
              status: "error",
              error: {
                message: `Error: ${i}`
              }
            }), t.complete();
          }
        });
      }).catch(h => {
        t.next({
          status: "error",
          error: {
            message: `Failed: ${h}`
          }
        }), t.complete();
      });
    });
  };
}