function pkT(T) {
  let R = T?.team?.disablePrivateThreads ?? !1,
    a = T?.team?.defaultThreadVisibility;
  if (!a || a === "private") return R ? "workspace" : "private";
  if (a === "thread_workspace_shared") return "workspace";
  if (a === "creator_groups_fallback_private") {
    if (T?.team?.groups?.length) return "group";
    return R ? "workspace" : "private";
  }
  return R ? "workspace" : "private";
}