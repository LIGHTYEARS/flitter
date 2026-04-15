async function syR(T) {
  if (!T) T = 43;
  if (T < 43 || T > 128) throw `Expected a length between 43 and 128. Received ${T}.`;
  let R = await iyR(T),
    a = await cyR(R);
  return {
    code_verifier: R,
    code_challenge: a
  };
}