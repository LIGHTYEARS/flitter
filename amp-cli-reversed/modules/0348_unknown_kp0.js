async function kp0(T) {
  let {
      transport: R,
      threadId: a,
      configService: e,
      skillService: t,
      logMessage: r
    } = T,
    h = T.fileSystem ?? He,
    i = {
      settings: await Pp0(e),
      workspaceId: T.workspaceRoot,
      workingDirectory: T.workspaceRoot,
      environment: {
        os: yp0("darwin")
      },
      tags: []
    };
  r?.("SEND", {
    type: "executor_connect",
    clientId: T.executorClientID,
    capabilities: i,
    executorType: T.executorType
  });
  let c = await R.executorHandshake(T.executorClientID, i, {
    executorType: T.executorType
  });
  r?.("RECV", c);
  try {
    let s = await CA0(a);
    r?.("SEND", {
      type: "executor_environment_snapshot",
      environment: s
    }), R.sendEnvironmentSnapshot(s);
    let A = {
      trees: s.workspaceRoot ? [{
        uri: s.workspaceRoot
      }] : [],
      platform: s.platform,
      tags: s.tags
    };
    await fp0(R, h, e, A, r), await Ip0(R, t, r), await T.initialToolDiscovery;
    let l = await m0(T.toolService.tools),
      o = RtT(l),
      n = oVT({
        transport: R,
        nextTools: o,
        previouslyAdvertisedTools: T.previouslyAdvertisedTools,
        forceRegisterAll: !0,
        logMessage: r
      });
    if (T.sendGitSnapshot !== !1) try {
      let p = await rVT(T.workspaceRoot);
      r?.("SEND", {
        type: "executor_artifact_upsert",
        available: p.available,
        fileCount: p.files.length,
        branch: p.branch,
        head: p.head
      }), R.sendExecutorArtifactUpsert(hVT(p));
    } catch {}
    return r?.("SEND", {
      type: "executor_tools_bootstrap_complete",
      ok: !0
    }), R.sendExecutorToolsBootstrapComplete(!0), {
      advertisedTools: n
    };
  } catch (s) {
    let A = s instanceof Error ? s.message : String(s);
    throw r?.("SEND", {
      type: "executor_tools_bootstrap_complete",
      ok: !1,
      error: A
    }), R.sendExecutorToolsBootstrapComplete(!1, A), s;
  }
}