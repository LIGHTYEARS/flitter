function GMR(T, R, a = {}) {
  let e = qMR(T);
  return XHT(T, e, R, a);
}
async function KMR(T, R, a) {
  let e = await VHT.stat(T);
  return XHT(T, e, R, a);
}
async function JMR(T, ...R) {
  let {
    fileFromPath: a
  } = await Promise.resolve().then(() => (XMR(), KHT));
  if (!emT) console.warn(`fileFromPath is deprecated; use fs.createReadStream(${JSON.stringify(T)}) instead`), emT = !0;
  return await a(T, ...R);
}