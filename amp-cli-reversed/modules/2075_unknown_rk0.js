async function rk0(T = Lr, R, a, e) {
  try {
    let t = LXT(R, e.signal),
      r = ik0(R, e.signal),
      h = await Promise.race([t, r]);
    J.info("Received api key", {
      source: h.source
    }), await a.set("apiKey", h.accessToken, T), J.info("Access token stored successfully");
  } finally {
    e.abort(Error("close after finalizing login"));
  }
}