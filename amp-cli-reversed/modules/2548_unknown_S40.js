function S40(T, R) {
  let {
      metadata: a,
      sensitiveMetadata: e
    } = TJT(T.metadata || {}),
    t = sN().version;
  return {
    feature: T.feature,
    action: T.action,
    timestamp: Date.now() * 1000,
    source: {
      client: R,
      ...(t && {
        clientVersion: t
      })
    },
    parameters: {
      ...(Object.keys(a).length > 0 && {
        metadata: a
      }),
      ...(Object.keys(e).length > 0 && {
        sensitiveMetadata: e
      })
    }
  };
}