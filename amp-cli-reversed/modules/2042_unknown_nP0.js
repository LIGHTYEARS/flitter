function nP0(T) {
  if (T.type === "artifacts_snapshot") {
    let R = oP0(T.artifacts);
    if (!R) return {
      status: null,
      error: null
    };
    return UxT(R, "snapshot");
  }
  if (T.type === "artifact_upserted") {
    if (!PY(T.artifact.key)) return {
      status: null,
      error: null
    };
    return UxT(T.artifact, "upsert");
  }
  if (!PY(T.key)) return {
    status: null,
    error: null
  };
  return {
    status: null,
    error: null
  };
}