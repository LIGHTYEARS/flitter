function UOR(T, R, a) {
  let e = {},
    t = H(R, ["expireTime"]);
  if (a !== void 0 && t != null) Y(a, ["expireTime"], t);
  let r = H(R, ["newSessionExpireTime"]);
  if (a !== void 0 && r != null) Y(a, ["newSessionExpireTime"], r);
  let h = H(R, ["uses"]);
  if (a !== void 0 && h != null) Y(a, ["uses"], h);
  let i = H(R, ["liveConnectConstraints"]);
  if (a !== void 0 && i != null) Y(a, ["bidiGenerateContentSetup"], KOR(T, i));
  let c = H(R, ["lockAdditionalFields"]);
  if (a !== void 0 && c != null) Y(a, ["fieldMask"], c);
  return e;
}