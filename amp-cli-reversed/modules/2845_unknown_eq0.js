function eq0(T) {
  let R = T.normalizedInput ?? T.input ?? T.inputIncomplete;
  if (R && typeof R === "object") {
    let a = R;
    if (typeof a.cmd === "string") return a.cmd;
    if (typeof a.command === "string") return a.command;
  }
  return;
}