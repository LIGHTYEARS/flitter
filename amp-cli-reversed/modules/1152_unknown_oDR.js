async function oDR(T) {
  let R = [];
  if (typeof T === "string" || ArrayBuffer.isView(T) || T instanceof ArrayBuffer) R.push(T);else if (OU(T)) R.push(await T.arrayBuffer());else if (_DR(T)) for await (let a of T) R.push(a);else throw Error(`Unexpected data type: ${typeof T}; constructor: ${T?.constructor?.name}; props: ${nDR(T)}`);
  return R;
}