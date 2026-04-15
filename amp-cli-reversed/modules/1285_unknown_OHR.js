function jHR() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "unknown";
  } catch {
    return "unknown";
  }
}
function SHR() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    return "unknown";
  }
}
async function OHR(T, R) {
  let a = await T.get(tw),
    e = a || IHR();
  if (!a) await T.set(tw, e);
  let t = await gHR({
    clientType: R.clientType,
    os: R.platform.os,
    osVersion: R.platform.osVersion,
    cpuArchitecture: R.platform.cpuArchitecture,
    webBrowser: R.platform.webBrowser,
    locale: jHR(),
    timezone: SHR()
  });
  return {
    installationID: e,
    deviceFingerprint: t
  };
}