async function m40(T, R, a) {
  let {
      toolService: e,
      mcpService: t,
      configService: r,
      skillService: h
    } = T,
    i = () => {
      R.write(`
Interrupted
`), process.exit(130);
    };
  if (process.on("SIGINT", i), !(await m0(e.tools)).some(P => P.spec.name === _L)) e.registerTool(OzT);
  let c = i40(h40),
    s;
  try {
    let {
      stdout: P
    } = await c("git", ["rev-parse", "--show-toplevel"]);
    s = P.trim();
  } catch {
    throw Error("Current directory is not in a git repository or git was not found");
  }
  let A = a.files?.map(P => {
      let k = rA.resolve(process.cwd(), P);
      return rA.relative(s, k);
    }),
    l = await Gk({
      toolName: _L,
      configService: r,
      toolService: e,
      mcpService: t,
      skillService: h
    }),
    o = OIT(R);
  o.update(oR.dim("Analyzing diff..."));
  let n, p;
  try {
    p = await A40(a.diffDescription, r);
    let P = [];
    for (let k of p) try {
      let {
        stdout: x
      } = await c("git", k, {
        cwd: s
      });
      P.push(x);
    } catch (x) {
      if (x && typeof x === "object" && "stdout" in x && typeof x.stdout === "string") P.push(x.stdout);
    }
    n = P.filter(Boolean).join(`
`);
  } catch {
    n = "";
  }
  let _;
  if (n.trim()) try {
    _ = (await l40(n, r)).summary;
  } catch (P) {
    R.write(`${oR.red("Error generating summary:")} ${P instanceof Error ? P.message : String(P)}
`);
  }
  if (o.stop(), _) {
    let P = p ? `${oR.dim(`(${p.map(k => `git ${k.join(" ")}`).join("; ")})`)}
` : "";
    R.write(`${oR.bold("Summary")} ${P}${_}

`);
  }
  if (a.summaryOnly) return;
  let m = OIT(R);
  m.update(oR.dim(a.checksOnly ? "Running checks..." : "Reviewing..."));
  function b(P, k) {
    return new Promise((x, f) => {
      let v = P.subscribe({
        next: g => {
          switch (g.status) {
            case "in-progress":
              break;
            case "done":
              {
                x(k(g.result)), v.unsubscribe();
                break;
              }
            case "error":
              {
                f(Error(JSON.stringify(g.error)));
                break;
              }
            case "rejected-by-user":
              {
                f(Error("Review rejected by user"));
                break;
              }
            case "cancelled":
              {
                f(Error("Review cancelled"));
                break;
              }
          }
        },
        error: g => f(g),
        complete: () => x({
          comments: [],
          checks: {}
        })
      });
    });
  }
  let y = await b(e.invokeTool(_L, {
    args: {
      diff_description: a.diffDescription,
      files: A,
      instructions: a.instructions,
      checkScope: a.checkScope,
      checkFilter: a.checkFilter,
      checksOnly: a.checksOnly
    }
  }, l), P => {
    if (a.checksOnly) return {
      comments: jIT(P.checks),
      checks: P.checks
    };
    if (P.main.status !== "done") throw Error("Review did not complete successfully");
    let k = P.main.review.comments.map(f => ({
        ...f,
        source: void 0
      })),
      x = jIT(P.checks);
    return {
      comments: [...k, ...x],
      checks: P.checks
    };
  });
  m.stop();
  let u = y.comments.filter(P => P.severity !== "low");
  if (R.write(`${oR.dim("Review")}
`), R.write(`${_40(u, s)}
`), Object.keys(y.checks).length > 0) R.write(`
${oR.dim("The following checks were run:")}
`), R.write(`${b40(y.checks)}
`);else R.write(`
${oR.dim("No checks were run.")}
`);
}