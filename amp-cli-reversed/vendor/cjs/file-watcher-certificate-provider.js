// Module: file-watcher-certificate-provider
// Original: uhR
// Type: CJS (RT wrapper)
// Exports: FileWatcherCertificateProvider
// Category: util

// Module: uhR (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.FileWatcherCertificateProvider = void 0));
  var R = qT("fs"),
    a = j3(),
    e = c8(),
    t = qT("util"),
    r = "certificate_provider";
  function h(s) {
    a.trace(e.LogVerbosity.DEBUG, r, s);
  }
  var i = (0, t.promisify)(R.readFile);
  class c {
    constructor(s) {
      if (
        ((this.config = s),
        (this.refreshTimer = null),
        (this.fileResultPromise = null),
        (this.latestCaUpdate = void 0),
        (this.caListeners = new Set()),
        (this.latestIdentityUpdate = void 0),
        (this.identityListeners = new Set()),
        (this.lastUpdateTime = null),
        (s.certificateFile === void 0) !== (s.privateKeyFile === void 0))
      )
        throw Error(
          "certificateFile and privateKeyFile must be set or unset together",
        );
      if (s.certificateFile === void 0 && s.caCertificateFile === void 0)
        throw Error(
          "At least one of certificateFile and caCertificateFile must be set",
        );
      h("File watcher constructed with config " + JSON.stringify(s));
    }
    updateCertificates() {
      if (this.fileResultPromise) return;
      ((this.fileResultPromise = Promise.allSettled([
        this.config.certificateFile
          ? i(this.config.certificateFile)
          : Promise.reject(),
        this.config.privateKeyFile
          ? i(this.config.privateKeyFile)
          : Promise.reject(),
        this.config.caCertificateFile
          ? i(this.config.caCertificateFile)
          : Promise.reject(),
      ])),
        this.fileResultPromise.then(([s, A, l]) => {
          if (!this.refreshTimer) return;
          if (
            (h(
              "File watcher read certificates certificate " +
                s.status +
                ", privateKey " +
                A.status +
                ", CA certificate " +
                l.status,
            ),
            (this.lastUpdateTime = new Date()),
            (this.fileResultPromise = null),
            s.status === "fulfilled" && A.status === "fulfilled")
          )
            this.latestIdentityUpdate = {
              certificate: s.value,
              privateKey: A.value,
            };
          else this.latestIdentityUpdate = null;
          if (l.status === "fulfilled")
            this.latestCaUpdate = { caCertificate: l.value };
          else this.latestCaUpdate = null;
          for (let o of this.identityListeners) o(this.latestIdentityUpdate);
          for (let o of this.caListeners) o(this.latestCaUpdate);
        }),
        h("File watcher initiated certificate update"));
    }
    maybeStartWatchingFiles() {
      if (!this.refreshTimer) {
        let s = this.lastUpdateTime
          ? new Date().getTime() - this.lastUpdateTime.getTime()
          : 1 / 0;
        if (s > this.config.refreshIntervalMs) this.updateCertificates();
        if (s > this.config.refreshIntervalMs * 2)
          ((this.latestCaUpdate = void 0),
            (this.latestIdentityUpdate = void 0));
        ((this.refreshTimer = setInterval(
          () => this.updateCertificates(),
          this.config.refreshIntervalMs,
        )),
          h("File watcher started watching"));
      }
    }
    maybeStopWatchingFiles() {
      if (this.caListeners.size === 0 && this.identityListeners.size === 0) {
        if (((this.fileResultPromise = null), this.refreshTimer))
          (clearInterval(this.refreshTimer), (this.refreshTimer = null));
      }
    }
    addCaCertificateListener(s) {
      if (
        (this.caListeners.add(s),
        this.maybeStartWatchingFiles(),
        this.latestCaUpdate !== void 0)
      )
        process.nextTick(s, this.latestCaUpdate);
    }
    removeCaCertificateListener(s) {
      (this.caListeners.delete(s), this.maybeStopWatchingFiles());
    }
    addIdentityCertificateListener(s) {
      if (
        (this.identityListeners.add(s),
        this.maybeStartWatchingFiles(),
        this.latestIdentityUpdate !== void 0)
      )
        process.nextTick(s, this.latestIdentityUpdate);
    }
    removeIdentityCertificateListener(s) {
      (this.identityListeners.delete(s), this.maybeStopWatchingFiles());
    }
  }
  T.FileWatcherCertificateProvider = c;
};
