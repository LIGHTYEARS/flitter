function mxR(T, R) {
  let a = ["## Info"];
  for (let e of T.content) switch (e.type) {
    case "text":
      a.push(r8T(e, !0));
      break;
    case "summary":
      a.push(gxR(e));
      break;
    case "manual_bash_invocation":
      if (!e.hidden) a.push(vxR(e, R));
      break;
  }
  return a.join(`

`);
}