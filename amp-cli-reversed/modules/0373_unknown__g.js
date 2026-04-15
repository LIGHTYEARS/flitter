async function kH(T, R) {
  let a = await R.get(T);
  if (!a) throw Error(`Failed to fetch thread snapshot: thread ${T} not found`);
  return a;
}
function _VT(T, R) {
  if (!R) return T;
  return {
    ...T,
    headers: {
      ...T?.headers,
      Authorization: `Bearer ${R}`
    }
  };
}
function Up0(T) {
  let R = yl0(T.messages),
    a = MKT(R);
  return {
    messages: R,
    processedIds: a
  };
}
function Hp0(T) {
  return MKT(T);
}
function _g(T, R) {
  let a = [...T];
  for (let e of R) if (e.type === "text") {
    let t = a[a.length - 1];
    if (t?.type === "text") a[a.length - 1] = {
      ...t,
      text: t.text + e.text
    };else a.push(e);
  } else if (e.type === "tool_use") {
    let t = a.findIndex(r => r.type === "tool_use" && r.id === e.id);
    if (t >= 0) a[t] = e;else a.push(e);
  } else if (e.type === "thinking") {
    let t = a[a.length - 1];
    if (t?.type === "thinking") a[a.length - 1] = {
      ...t,
      thinking: t.thinking + e.thinking
    };else a.push(e);
  } else a.push(e);
  return a;
}