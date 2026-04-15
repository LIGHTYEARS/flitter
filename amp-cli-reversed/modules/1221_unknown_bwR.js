async function bwR(T, R) {
  if (!R) return null;
  let a = MR.joinPath(Ht(R), ...LwR.split("/"));
  try {
    return await T.stat(a), Kt(a);
  } catch (e) {
    if (e instanceof ur) return null;
    return J.warn("Failed to resolve preview instructions file", {
      error: e,
      previewInstructionsURI: a.toString()
    }), null;
  }
}