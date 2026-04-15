function UxT(T, R) {
  try {
    let a = Buffer.from(T.contentBase64, "base64").toString("utf8"),
      e = $s0.safeParse(JSON.parse(a));
    if (e.success) return {
      status: e.data,
      error: null
    };
    return {
      status: null,
      error: `${R}: invalid git status artifact payload`
    };
  } catch {
    return {
      status: null,
      error: `${R}: failed to decode git status artifact payload`
    };
  }
}