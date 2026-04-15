function b$R(T, R, a, e = 1) {
  let t = !R.startsWith(`${a}/`) && R.split("/").length === e;
  if (T.isVertexAI()) if (R.startsWith("projects/")) return R;else if (R.startsWith("locations/")) return `projects/${T.getProject()}/${R}`;else if (R.startsWith(`${a}/`)) return `projects/${T.getProject()}/locations/${T.getLocation()}/${R}`;else if (t) return `projects/${T.getProject()}/locations/${T.getLocation()}/${a}/${R}`;else return R;
  if (t) return `${a}/${R}`;
  return R;
}