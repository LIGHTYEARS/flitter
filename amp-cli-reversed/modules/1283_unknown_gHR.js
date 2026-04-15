async function gHR(T) {
  let R = {
      clientType: Cy(T.clientType),
      cpuArchitecture: Cy(T.cpuArchitecture),
      locale: Cy(T.locale),
      os: Cy(T.os),
      osVersionMajor: $HR(T.osVersion),
      timezone: Cy(T.timezone),
      webBrowser: T.webBrowser ? "true" : "false"
    },
    a = JSON.stringify(R);
  return `v1:fp_${await vHR(a)}`;
}