function Sc0(T) {
  if (T?.team?.groups !== void 0) return Error(["Group visibility is not available. ", `You are not a member of any group in this workspace.
`].join(""));
  return Error(`Group visibility is not available.
`);
}