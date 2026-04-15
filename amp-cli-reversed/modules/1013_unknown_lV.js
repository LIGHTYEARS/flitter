async function lV(T) {
  let R = [];
  if (typeof T === "string" || ArrayBuffer.isView(T) || T instanceof ArrayBuffer) R.push(T);else if (jNT(T)) R.push(T instanceof Blob ? T : await T.arrayBuffer());else if (R3T(T)) for await (let a of T) R.push(...(await lV(a)));else {
    let a = T?.constructor?.name;
    throw Error(`Unexpected data type: ${typeof T}${a ? `; constructor: ${a}` : ""}${hCR(T)}`);
  }
  return R;
}