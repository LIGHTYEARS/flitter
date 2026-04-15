function Jn0(T) {
  switch (T.type) {
    case "artifacts_snapshot":
      return {
        type: "artifacts_snapshot",
        message: T
      };
    case "artifact_upserted":
      return {
        type: "artifact_upserted",
        message: T
      };
    case "artifact_deleted":
      return {
        type: "artifact_deleted",
        message: T
      };
  }
}