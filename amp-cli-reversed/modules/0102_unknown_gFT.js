function g0() {
  return Vx("actor-client");
}
async function gFT() {
  if (h4 !== null) return h4;
  return h4 = (async () => {
    let T;
    if (typeof WebSocket < "u") T = WebSocket;else try {
      T = (await Promise.resolve().then(() => (Q0T(), Y0T))).default, g0().debug("using websocket from npm");
    } catch {
      T = class {
        constructor() {
          throw Error('WebSocket support requires installing the "ws" peer dependency.');
        }
      }, g0().debug("using mock websocket");
    }
    return T;
  })(), h4;
}