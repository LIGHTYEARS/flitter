function qW0(T, R, a) {
  let e = R.toolResult.run;
  if (T === OW0) return {
    type: "apply-patch",
    id: R.id,
    sourceIndex: a,
    status: e.status,
    error: e.status === "error" && e.error ? e.error.message : void 0,
    guidanceFiles: $b(e),
    result: aq0(e)
  };
  if (T === dW0) return zW0(R, a);
  if (T === EW0) {
    let t = R.toolUse.input,
      r = e.status === "done" && typeof e.result === "object" && e.result && "diff" in e.result ? e.result.diff : void 0;
    return {
      type: "edit-file",
      id: R.id,
      sourceIndex: a,
      status: e.status,
      error: e.status === "error" && e.error ? e.error.message : void 0,
      path: t?.path,
      oldText: t?.old_str,
      newText: t?.new_str,
      diff: r,
      guidanceFiles: $b(e)
    };
  }
  if (T === CW0) {
    let t = R.toolUse.input;
    return {
      type: "create-file",
      id: R.id,
      sourceIndex: a,
      status: e.status,
      error: e.status === "error" && e.error ? e.error.message : void 0,
      path: t?.path,
      content: t?.content,
      guidanceFiles: $b(e)
    };
  }
  if (T === LW0) {
    let t = R.toolUse.input,
      r = e.status === "done" && typeof e.result === "string" ? e.result : void 0;
    return {
      type: "undo-edit",
      id: R.id,
      sourceIndex: a,
      status: e.status,
      error: e.status === "error" && e.error ? e.error.message : void 0,
      path: t?.path,
      diff: r
    };
  }
  if (T === MW0) {
    let t = R.toolUse.input;
    return {
      type: "skill",
      id: R.id,
      sourceIndex: a,
      status: e.status,
      skillName: t?.name
    };
  }
  return {
    type: "generic-tool",
    id: R.id,
    sourceIndex: a,
    status: e.status,
    toolName: T
  };
}