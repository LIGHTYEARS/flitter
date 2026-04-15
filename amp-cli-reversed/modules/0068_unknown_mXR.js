function mXR(T, R, a, e) {
  return new AR(t => {
    let r = new wi(),
      h = bz.model ? Xt(bz.model) : void 0;
    if (!h) {
      t.error(Error("Walkthrough subagent has no model defined"));
      return;
    }
    let i = {
        systemPrompt: xXR,
        model: h,
        spec: bz
      },
      c = [{
        role: "user",
        content: R ? `Context: ${R}

Topic: ${T}` : `Topic: ${T}`
      }],
      s = r.run(Fx, i, {
        conversation: c,
        toolService: a,
        env: e,
        followUps: [A => A.push({
          role: "user",
          content: fXR
        }), A => A.push({
          role: "user",
          content: IXR
        })]
      }).subscribe({
        next: A => t.next(A),
        error: A => t.error(A),
        complete: () => t.complete()
      });
    return () => {
      s.unsubscribe();
    };
  });
}