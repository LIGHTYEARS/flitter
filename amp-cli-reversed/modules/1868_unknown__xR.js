function pxR(T, R) {
  switch (T.role) {
    case "user":
      return _xR(T, R);
    case "assistant":
      return bxR(T);
    case "info":
      return mxR(T, R);
  }
}
function _xR(T, R) {
  let a = ["## User"];
  if (T.interrupted) a.push("*(interrupted)*");
  let e = [];
  for (let t of T.content) switch (t.type) {
    case "text":
      e.push(r8T(t, !0));
      break;
    case "image":
      a.push(uxR(t));
      break;
    case "tool_result":
      a.push(fxR(t, R));
      break;
  }
  if (T.fileMentions) a.push(yxR(T.fileMentions));
  return a.push(...e), a.join(`

`);
}