function MA(T) {
  switch (T) {
    case "public":
      return {
        visibility: "public_discoverable"
      };
    case "unlisted":
      return {
        visibility: "public_unlisted"
      };
    case "workspace":
      return {
        visibility: "thread_workspace_shared"
      };
    case "private":
      return {
        visibility: "private",
        sharedGroupIDs: []
      };
    case "group":
      return {
        visibility: "private",
        shareWithAllCreatorGroups: !0
      };
  }
}