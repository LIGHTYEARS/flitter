function FBT(T, R) {
  let a = g8(T, R);
  if (!a) return "";
  if (a.startsWith("publishers/") && T.isVertexAI()) return `projects/${T.getProject()}/locations/${T.getLocation()}/${a}`;else if (a.startsWith("models/") && T.isVertexAI()) return `projects/${T.getProject()}/locations/${T.getLocation()}/publishers/google/${a}`;else return a;
}