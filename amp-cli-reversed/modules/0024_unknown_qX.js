function qX(T, R, a) {
  let e = [{
      role: "user",
      content: T
    }],
    t = a === "bitbucket-enterprise" ? _LT : Y2,
    r = {
      ...qe.librarian,
      includeTools: t
    },
    h = i => {
      let c = SKR(a, R.config, {
        instanceUrl: i
      });
      return new wi().run(Fx, {
        systemPrompt: c,
        model: qe.librarian.model,
        spec: r
      }, {
        conversation: e,
        toolService: R.toolService,
        env: R
      }).pipe(JR(xKR));
    };
  if (a === "bitbucket-enterprise" && R.config.settings.bitbucketToken) return Q9(() => yKR(R.configService)).pipe(L9(i => h(i)));
  return h();
}