function EOR(T) {
  let R = {};
  return T.forEach((a, e) => {
    R[e] = a;
  }), R;
}
function COR(T) {
  let R = new Headers();
  for (let [a, e] of Object.entries(T)) R.append(a, e);
  return R;
}
async function LOR(T, R, a) {
  let e = new qBT(),
    t;
  if (a.data instanceof Blob) t = await a.data.text();else if (a.data instanceof ArrayBuffer) t = new TextDecoder().decode(a.data);else t = a.data;
  let r = JSON.parse(t);
  if (T.isVertexAI()) {
    let h = mjR(r);
    Object.assign(e, h);
  } else Object.assign(e, r);
  R(e);
}