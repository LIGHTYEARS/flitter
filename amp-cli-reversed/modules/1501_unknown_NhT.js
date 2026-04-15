function NhT(T) {
  let R = Object.keys(T.shape);
  for (let e of R) if (!T.shape?.[e]?._zod?.traits?.has("$ZodType")) throw Error(`Invalid element at key "${e}": expected a Zod schema`);
  let a = FvT(T.shape);
  return {
    ...T,
    keys: R,
    keySet: new Set(R),
    numKeys: R.length,
    optionalKeys: new Set(a)
  };
}