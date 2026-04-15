async function Gk(T) {
  let {
      toolName: R,
      dtwHandoffService: a,
      dtwArtifactSyncService: e,
      configService: t,
      toolService: r,
      mcpService: h,
      skillService: i,
      fsTracker: c,
      toolUseID: s,
      discoveredGuidanceFileURIs: A,
      threadID: l
    } = T,
    o = {
      id: l ?? Eh(),
      created: Date.now(),
      v: 0,
      messages: []
    },
    n = zR.file(process.cwd()),
    p = s ?? fx(),
    _ = await t.getLatest(),
    m,
    b;
  if (c) m = c.trackedFileSystem(p), b = c.tracker;else b = dWT(CG, o.id, async () => {}), m = CWT(He, b, p);
  return {
    dir: n,
    tool: R,
    thread: o,
    dtwHandoffService: a,
    dtwArtifactSyncService: e,
    trackedFiles: new Ls(),
    toolUseID: p,
    todos: void 0,
    configService: t,
    toolService: r,
    mcpService: h,
    config: _,
    filesystem: m,
    fileChangeTracker: b,
    getAllTrackedChanges: async () => b.getAllRecords(),
    threadEnvironment: {
      trees: [],
      platform: "cli"
    },
    handleThreadDelta: () => Promise.resolve(),
    threadService: {
      observe: () => AR.of(o),
      get: () => Promise.resolve(o),
      getPrimitiveProperty: (y, u) => Promise.resolve(o[u]),
      flushVersion: () => Promise.resolve(),
      updateThreadMeta: () => Promise.resolve()
    },
    getThreadEnvironment: () => Promise.resolve({
      trees: [],
      platform: "cli"
    }),
    threadSummaryService: {
      summarizeThread: () => Promise.resolve({
        summary: "CLI execution",
        prompt: "CLI execution",
        title: "CLI Tool"
      })
    },
    osFileSystem: He,
    deleteThread: () => Promise.resolve(),
    generateThreadTitle: () => Promise.resolve({
      title: "CLI Tool Execution"
    }),
    fileChangeTrackerStorage: CG,
    discoveredGuidanceFileURIs: A ?? new Set(),
    skillService: i ?? {
      getSkills: () => Promise.resolve([]),
      getTargetDir: () => Promise.resolve("/tmp/skills"),
      listInstalled: () => [],
      reload: () => {}
    }
  };
}