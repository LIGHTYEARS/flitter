function zWR() {
  return !process.execPath.includes("node");
}
function FWR(T, R) {
  let a = qWR();
  if (!a) return null;
  return {
    child: WWR(a.command, T, {
      ...R,
      env: {
        ...process.env,
        ...a.env,
        ...R?.extraEnv
      }
    })
  };
}