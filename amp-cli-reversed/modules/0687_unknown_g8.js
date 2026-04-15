function g8(T, R) {
  if (!R || typeof R !== "string") throw Error("model is required and must be a string");
  if (R.includes("..") || R.includes("?") || R.includes("&")) throw Error("invalid model parameter");
  if (T.isVertexAI()) {
    if (R.startsWith("publishers/") || R.startsWith("projects/") || R.startsWith("models/")) return R;else if (R.indexOf("/") >= 0) {
      let a = R.split("/", 2);
      return `publishers/${a[0]}/models/${a[1]}`;
    } else return `publishers/google/models/${R}`;
  } else if (R.startsWith("models/") || R.startsWith("tunedModels/")) return R;else return `models/${R}`;
}