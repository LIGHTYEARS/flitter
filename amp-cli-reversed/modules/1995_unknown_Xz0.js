function Vz0(T) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(T);
}
async function Xz0(T) {
  let R = await fetch(`${T.workerURL}/threads/${T.threadID}/spawn`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${T.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      repositoryURL: T.repositoryURL,
      ...(T.projectID ? {
        projectID: T.projectID
      } : {})
    })
  });
  if (!R.ok) {
    let a = await R.text();
    throw new GR(`Spawn request failed (${R.status}): ${a}`, 1);
  }
}