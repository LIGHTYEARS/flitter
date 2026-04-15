function Gz0(T) {
  return typeof T === "object" && T !== null && "durableObjectId" in T && typeof T.durableObjectId === "string" && T.durableObjectId.length > 0;
}
async function Kz0(T) {
  let R = await fetch(new URL(`/threads/${T.threadID}/durable-object-id`, T.workerURL), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${T.apiKey}`
    }
  });
  if (!R.ok) {
    let e = await R.text();
    throw new GR(`Durable object ID request failed (${R.status}): ${e}`, 1);
  }
  let a = await R.json();
  if (!Gz0(a)) throw new GR("Durable object ID response did not include a durableObjectId", 1);
  return a.durableObjectId;
}