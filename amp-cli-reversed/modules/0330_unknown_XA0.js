function BA0(T, R = aVT) {
  return yH(T, R, a => ({
    type: "executor_tools_register",
    tools: a
  }));
}
function NA0(T, R = aVT) {
  return yH(T, R, a => ({
    type: "executor_tools_unregister",
    toolNames: a
  }));
}
async function GA0(T, R, a) {
  let e = [];
  for (let t = 0; t < T.length; t += R) {
    let r = T.slice(t, t + R);
    e.push(...(await Promise.all(r.map(a))));
  }
  return e;
}
function VA0(T) {
  return (T.fullFileDiff?.length ?? 0) + (T.oldContent?.length ?? 0) + (T.newContent?.length ?? 0);
}
function XA0(T) {
  let R = !1;
  if (T.fullFileDiff !== void 0 && T.fullFileDiff !== T.diff) T.fullFileDiff = T.diff, R = !0;
  if (T.oldContent !== void 0 && T.oldContent !== TA) T.oldContent = TA, R = !0;
  if (T.newContent !== void 0 && T.newContent !== TA) T.newContent = TA, R = !0;
  return R;
}