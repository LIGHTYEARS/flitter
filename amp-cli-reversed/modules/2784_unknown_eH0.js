function eH0(T) {
  if (!T || typeof T !== "object") return null;
  let R = "meta" in T && T.meta && typeof T.meta === "object" ? T.meta : null;
  if (!R) return null;
  if (!("visibility" in R)) return null;
  switch (R.visibility) {
    case "public_discoverable":
      return "public";
    case "public_unlisted":
      return "unlisted";
    case "thread_workspace_shared":
      return "workspace";
    case "private":
      {
        let a = "sharedGroupIDs" in R ? R.sharedGroupIDs : null;
        return Array.isArray(a) && a.length > 0 ? "group" : "private";
      }
    default:
      return null;
  }
}