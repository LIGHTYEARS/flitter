async function hk0(T = Lr, R, a, e) {
  try {
    let t = await LXT(R, e.signal);
    J.info("Received api key", {
      source: t.source
    }), await a.set("apiKey", t.accessToken, T), J.info("Access token stored successfully");
  } finally {
    e.abort(Error("close after finalizing login"));
  }
}