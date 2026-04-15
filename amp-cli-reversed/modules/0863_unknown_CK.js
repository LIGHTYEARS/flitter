function CK(T, R) {
  let a = {},
    e = H(T, ["name"]);
  if (e != null) Y(a, ["name"], e);
  let t = H(T, ["displayName"]);
  if (t != null) Y(a, ["displayName"], t);
  let r = H(T, ["description"]);
  if (r != null) Y(a, ["description"], r);
  let h = H(T, ["version"]);
  if (h != null) Y(a, ["version"], h);
  let i = H(T, ["_self"]);
  if (i != null) Y(a, ["tunedModelInfo"], TOR(i));
  let c = H(T, ["inputTokenLimit"]);
  if (c != null) Y(a, ["inputTokenLimit"], c);
  let s = H(T, ["outputTokenLimit"]);
  if (s != null) Y(a, ["outputTokenLimit"], s);
  let A = H(T, ["supportedGenerationMethods"]);
  if (A != null) Y(a, ["supportedActions"], A);
  let l = H(T, ["temperature"]);
  if (l != null) Y(a, ["temperature"], l);
  let o = H(T, ["maxTemperature"]);
  if (o != null) Y(a, ["maxTemperature"], o);
  let n = H(T, ["topP"]);
  if (n != null) Y(a, ["topP"], n);
  let p = H(T, ["topK"]);
  if (p != null) Y(a, ["topK"], p);
  let _ = H(T, ["thinking"]);
  if (_ != null) Y(a, ["thinking"], _);
  return a;
}