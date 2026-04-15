async function yKR(T) {
  try {
    let R = await fi("/api/internal/bitbucket-instance-url", void 0, T);
    if (!R.ok) return;
    return (await R.json()).instanceUrl ?? void 0;
  } catch (R) {
    J.error("Failed to fetch Bitbucket instance URL", {
      error: R instanceof Error ? R.message : String(R)
    });
    return;
  }
}