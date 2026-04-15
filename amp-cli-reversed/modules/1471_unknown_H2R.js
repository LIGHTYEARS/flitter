function H2R() {
  return ({
    args: T
  }, R) => {
    let a = [];
    return new AR(e => {
      let t = new wi(),
        r = g2R(0.7),
        h = [{
          role: "user",
          content: T.query
        }],
        i = WzT(R),
        c = t.run(r, {
          systemPrompt: i,
          model: U2R,
          spec: qe.finder
        }, {
          conversation: h,
          toolService: R.toolService,
          env: R
        }).subscribe({
          next: s => e.next(s),
          error: s => {
            if (s instanceof rp) {
              let A = new CaT("Search agent reached context window limit. Please try a more specific search query.", "Search agent reached context window limit and failed to return result.");
              e.error(A);
            } else e.error(s);
          },
          complete: () => e.complete()
        });
      return a.push(() => c.unsubscribe()), () => a.forEach(s => s());
    }).pipe(JR(HzT));
  };
}