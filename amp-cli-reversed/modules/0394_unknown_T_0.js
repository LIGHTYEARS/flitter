async function T_0(T) {
  let R = await uA(T.threadId, T.configService, T.apiKey, {
    usesThreadActors: T.useThreadActors
  });
  if (!R.usesDtw) throw Error("Headless DTW requires a durable thread. Open the thread in the CLI first to import it.");
  await new bVT({
    ...T,
    threadId: R.threadId,
    ownerUserId: R.ownerUserId,
    threadVersion: R.threadVersion,
    agentMode: R.agentMode,
    useThreadActors: R.usesThreadActors
  }).start();
}