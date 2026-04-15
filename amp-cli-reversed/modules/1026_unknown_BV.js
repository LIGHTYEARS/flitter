function OCR(T, R) {
  if (T.text?.format?.type !== "json_schema") return null;
  if ("$parseRaw" in T.text?.format) return (T.text?.format).$parseRaw(R);
  return JSON.parse(R);
}
function dCR(T) {
  if (a3T(T.text?.format)) return !0;
  return !1;
}
function ECR(T) {
  return T?.$brand === "auto-parseable-tool";
}
function CCR(T, R) {
  return T.find(a => a.type === "function" && a.name === R);
}
function LCR(T, R) {
  let a = CCR(T.tools ?? [], R.name);
  return {
    ...R,
    ...R,
    parsed_arguments: ECR(a) ? a.$parseRaw(R.arguments) : a?.strict ? JSON.parse(R.arguments) : null
  };
}
function BV(T) {
  let R = [];
  for (let a of T.output) {
    if (a.type !== "message") continue;
    for (let e of a.content) if (e.type === "output_text") R.push(e.text);
  }
  T.output_text = R.join("");
}