function ck0() {
  let T = null,
    R = [],
    a = null,
    e = [],
    t = h => {
      if (!T) {
        R.push(h);
        return;
      }
      T(h);
    },
    r = h => {
      if (!a) {
        e.push(h);
        return;
      }
      switch (h.type) {
        case "connection_change":
          a.handleConnectionChange(h.info);
          break;
        case "tool_lease":
          a.onToolLeaseMessage(h.message);
          break;
        case "tool_lease_revoked":
          a.onToolLeaseRevokedMessage(h.message);
          break;
        case "executor_rollback_request":
          a.onExecutorRollbackRequestMessage(h.message);
          break;
        case "executor_filesystem_read_directory_request":
          a.onExecutorFileSystemReadDirectoryRequestMessage(h.message);
          break;
        case "executor_filesystem_read_file_request":
          a.onExecutorFileSystemReadFileRequestMessage(h.message);
          break;
      }
    };
  return {
    observerCallbacks: {
      onEvent: h => {
        t(h);
      }
    },
    executorCallbacks: {
      onConnectionChange: h => {
        r({
          type: "connection_change",
          info: h
        });
      },
      onToolLease: h => {
        r({
          type: "tool_lease",
          message: h
        });
      },
      onToolLeaseRevoked: h => {
        r({
          type: "tool_lease_revoked",
          message: h
        });
      },
      onExecutorRollbackRequest: h => {
        r({
          type: "executor_rollback_request",
          message: h
        });
      },
      onFileSystemReadDirectoryRequest: h => {
        r({
          type: "executor_filesystem_read_directory_request",
          message: h
        });
      },
      onFileSystemReadFileRequest: h => {
        r({
          type: "executor_filesystem_read_file_request",
          message: h
        });
      }
    },
    bindObserverEventHandler: h => {
      if (T = h, R.length === 0) return;
      for (let i of R) h(i);
      R.length = 0;
    },
    bindExecutorRuntime: h => {
      if (a = h, e.length === 0) return;
      for (let i of e) r(i);
      e.length = 0;
    }
  };
}