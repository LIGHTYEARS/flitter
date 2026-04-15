async function KVR(T, R, a) {
  try {
    let e = await fi(`/api/threads/${T}.md?truncate_tool_results=1`, {
      signal: R
    }, a);
    if (!e.ok) throw Error(`Thread ${T} not found (server returned ${e.status})`);
    return await e.text();
  } catch (e) {
    if (e instanceof Error && e.name === "MissingApiKeyError") throw Error(`Thread ${T} not found locally and cannot fetch from server: API key not configured`);
    throw e;
  }
}