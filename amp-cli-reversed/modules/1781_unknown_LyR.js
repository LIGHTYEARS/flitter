async function LyR(T, {
  metadata: R,
  clientMetadata: a,
  fetchFn: e
}) {
  let t;
  if (R) {
    if (!R.registration_endpoint) throw Error("Incompatible auth server: does not support dynamic client registration");
    t = new URL(R.registration_endpoint);
  } else t = new URL("/register", T);
  let r = await (e ?? fetch)(t, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(a)
  });
  if (!r.ok) throw await XMT(r);
  return KMT.parse(await r.json());
}