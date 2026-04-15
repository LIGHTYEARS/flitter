async function o70(T, R) {
  let a = await Rx.promises.readFile(T, "utf-8"),
    e = i70(a);
  n70(e, R);
  let t = A70(e);
  return {
    name: e.name || R,
    dirName: R,
    palette: t,
    path: T
  };
}