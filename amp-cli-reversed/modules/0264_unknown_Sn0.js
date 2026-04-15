function Sn0(T, R) {
  let a = vKT(R);
  if (T && a) return `type ${JSON.stringify(T)} failed validation: ${a}`;
  if (T) return `type ${JSON.stringify(T)} failed validation`;
  if (a) return `message payload failed validation: ${a}`;
  return "message payload failed validation";
}