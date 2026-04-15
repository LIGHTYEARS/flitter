function dFR(T) {
  let {
      instructions: R,
      files: a,
      diffDescription: e,
      checkScope: t,
      checkFilter: r,
      checksOnly: h,
      thoroughness: i,
      toolService: c,
      env: s
    } = OFR(T),
    A = R;
  if (a && a.length > 0) A += `

Focus on these files:
${a.join(`
`)}`;
  let l = {
      status: "in-progress",
      turns: []
    },
    o = h ? new AR(p => {
      p.next({
        status: "done",
        message: "<codeReview></codeReview>",
        turns: []
      }), p.complete();
    }) : EFR(e, c, s, A, i).pipe(Y3(l)),
    n = gFR({
      diffDescription: e,
      targetFiles: a,
      checkScope: t,
      checkFilter: r
    }, c, s).pipe(Y3([]));
  return v3(o, n).pipe(JR(([p, _]) => {
    return {
      mainAgentStatus: p,
      checkRuns: _,
      workingDir: s.dir?.fsPath
    };
  }));
}