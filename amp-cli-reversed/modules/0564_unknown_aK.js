async function aK(T) {
  let R = [];
  if (typeof T === "string" || ArrayBuffer.isView(T) || T instanceof ArrayBuffer) R.push(T);else if (Y7T(T)) R.push(T instanceof Blob ? T : await T.arrayBuffer());else if (X7T(T)) for await (let a of T) R.push(...(await aK(a)));else {
    let a = T?.constructor?.name;
    throw Error(`Unexpected data type: ${typeof T}${a ? `; constructor: ${a}` : ""}${QxR(T)}`);
  }
  return R;
}