function lbR(T) {
  return T.config.pipe(JR(({
    settings: R,
    secrets: a
  }) => ({
    url: R.url,
    proxy: R.proxy,
    secrets: a
  })), E9(MD), L9(R => hET(600000).pipe(Y3(void 0), f0T(() => Q9(async a => {
    let e = await N3.getUserInfo({}, {
      signal: a,
      config: T
    });
    if (e.ok) return e.result;
    if (e.error && e.error.code === "auth-required") return null;
    throw J.error("getUserInfo failed", {
      error: e.error
    }), Error(`getUserInfo error: ${e.error.code}`);
  })))), JR(R => {
    return R instanceof Error ? {
      error: {
        message: String(R)
      }
    } : R === Jo ? "pending" : R ? {
      user: R,
      features: R.features,
      workspace: R?.team,
      mysteriousMessage: R?.mysteriousMessage
    } : {
      error: {
        message: "User not found"
      }
    };
  }), E9((R, a) => MD(R, a)), f3({
    shouldCountRefs: !0
  }));
}