function k1R() {
  let T = sN(),
    R = JS(),
    a = JlR();
  return {
    os: R.os,
    osVersion: R.osVersion,
    cpuArchitecture: R.cpuArchitecture,
    webBrowser: R.webBrowser,
    client: T.name,
    clientVersion: T.version,
    clientType: T.type,
    installationID: a?.installationID,
    deviceFingerprint: a?.deviceFingerprint
  };
}