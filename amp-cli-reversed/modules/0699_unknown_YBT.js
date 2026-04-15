function Cn(T, R) {
  if (typeof R !== "string") throw Error("name must be a string");
  return b$R(T, R, "cachedContents");
}
function YBT(T) {
  switch (T) {
    case "STATE_UNSPECIFIED":
      return "JOB_STATE_UNSPECIFIED";
    case "CREATING":
      return "JOB_STATE_RUNNING";
    case "ACTIVE":
      return "JOB_STATE_SUCCEEDED";
    case "FAILED":
      return "JOB_STATE_FAILED";
    default:
      return T;
  }
}