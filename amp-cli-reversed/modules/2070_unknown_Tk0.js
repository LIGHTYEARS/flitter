async function Tk0(T) {
  let R = (await kH(T.threadId, T.threadService)).env?.initial?.trees?.[0]?.repository?.url?.trim();
  if (!R) throw new GR("This thread does not expose a repository URL, so live-sync cannot request an executor reconnect automatically.", 1);
  return {
    repositoryURL: R
  };
}