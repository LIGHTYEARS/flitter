function nvR(T) {
  let R = {},
    a = H(T, ["retrievalConfig"]);
  if (a != null) Y(R, ["retrievalConfig"], a);
  let e = H(T, ["functionCallingConfig"]);
  if (e != null) Y(R, ["functionCallingConfig"], K$R(e));
  return R;
}