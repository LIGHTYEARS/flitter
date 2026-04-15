function LdT(T) {
  let R = c0T(() => {
    return X8([eR(T), b8(), Q8(), Qv(), i0(R), _3(eR(), R)]);
  });
  return R;
}
function PD(T, R) {
  return Tj(f6(T), R);
}
function KoR(T) {
  st({
    customError: T
  });
}
function VoR() {
  return st().customError;
}
function YoR(T, R) {
  let a = T.$schema;
  if (a === "https://json-schema.org/draft/2020-12/schema") return "draft-2020-12";
  if (a === "http://json-schema.org/draft-07/schema#") return "draft-7";
  if (a === "http://json-schema.org/draft-04/schema#") return "draft-4";
  return R ?? "draft-2020-12";
}