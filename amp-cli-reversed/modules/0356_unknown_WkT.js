function gp0(T) {
  let R = new Headers({
    "Content-Type": "application/json"
  });
  if (T) R.set("Authorization", `Bearer ${T}`);
  return R;
}
async function atT(T, R, a) {
  return fetch(`${T.workerURL}${R}`, {
    method: "POST",
    headers: gp0(T.apiKey),
    body: JSON.stringify(a),
    signal: T.signal
  });
}
async function WkT(T, R, a, e) {
  let t = await atT(T, `/threads/${R}/handoff`, {
    goal: a,
    images: e
  });
  if (!t.ok) throw Error(`Failed to generate handoff prompt: ${t.status} ${await t.text()}`);
  return await t.json();
}