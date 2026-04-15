async function gD0(T) {
  let R = {
      configService: T.configService,
      threadService: T.threadService,
      toolService: T.toolService,
      skillService: T.skillService,
      getThreadEnvironment: T.getThreadEnvironment,
      fileChangeTrackerStorage: new Im(T.fileSystem),
      osFileSystem: T.fileSystem,
      deleteThread: t => T.threadService.delete(t),
      generateThreadTitle: tzT,
      mcpService: T.mcpService,
      pluginService: T.pluginService,
      getServerStatus: void 0
    },
    a = async t => {
      let r = t ?? Eh(),
        h = await ct.getOrCreateForThread(R, r);
      return await h.resume(), h;
    };
  if (T.threadId) await NIT(T.threadId, T);
  let e = await a(T.threadId);
  return {
    threadPool: new SrT({
      threadService: T.threadService,
      workerDeps: R,
      handleError: t => {
        throw t instanceof Error ? t : Error(String(t));
      },
      createThread: async () => a(),
      validateThreadOwnership: async t => {
        if (!t || !Vt(t)) throw new GR(`Invalid thread ID: ${t}`, 1);
        await NIT(t, T);
      }
    }, e)
  };
}