async function yPR(T) {
  let R = await fetch(T, {
    signal: AbortSignal.timeout(1e4)
  });
  if (!R.ok) throw Error(`MCP registry request failed with status ${R.status}`);
  return (await R.json()).servers.map(a => a.server);
}