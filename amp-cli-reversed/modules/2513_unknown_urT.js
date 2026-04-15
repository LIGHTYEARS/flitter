function DC0(T) {
  let R = ["private", "unlisted", "public", "workspace"];
  if (T?.team?.groups && T.team.groups.length > 0) R.push("group");
  return R;
}
function urT(T, R = null) {
  let a = T !== null && typeof T === "object" && "visibility" in T ? T.visibility : void 0;
  if (!a || typeof a !== "string") return;
  let e = DC0(R);
  if (e.includes(a)) return a;
  if (a === "group" && !e.includes("group")) {
    if (R?.team?.groups !== void 0) return Error(`Group visibility is not available. You are not a member of any group in this workspace.
`);
    return Error(`Group visibility is not available.
`);
  }
  return Error(`Invalid visibility. Must be one of: ${e.join(", ")}
`);
}