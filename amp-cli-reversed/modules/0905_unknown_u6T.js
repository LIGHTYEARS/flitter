async function dOR(T, R, a) {
  let e = new zBT(),
    t;
  if (a.data instanceof Blob) t = JSON.parse(await a.data.text());else t = JSON.parse(a.data);
  Object.assign(e, t), R(e);
}
class u6T {
  constructor(T, R, a) {
    this.apiClient = T, this.auth = R, this.webSocketFactory = a;
  }
  async connect(T) {
    var R, a;
    if (this.apiClient.isVertexAI()) throw Error("Live music is not supported for Vertex AI.");
    console.warn("Live music generation is experimental and may change in future versions.");
    let e = this.apiClient.getWebsocketBaseUrl(),
      t = this.apiClient.getApiVersion(),
      r = COR(this.apiClient.getDefaultHeaders()),
      h = this.apiClient.getApiKey(),
      i = `${e}/ws/google.ai.generativelanguage.${t}.GenerativeService.BidiGenerateMusic?key=${h}`,
      c = () => {},
      s = new Promise(m => {
        c = m;
      }),
      A = T.callbacks,
      l = function () {
        c({});
      },
      o = this.apiClient,
      n = {
        onopen: l,
        onmessage: m => {
          dOR(o, A.onmessage, m);
        },
        onerror: (R = A === null || A === void 0 ? void 0 : A.onerror) !== null && R !== void 0 ? R : function (m) {},
        onclose: (a = A === null || A === void 0 ? void 0 : A.onclose) !== null && a !== void 0 ? a : function (m) {}
      },
      p = this.webSocketFactory.create(i, EOR(r), n);
    p.connect(), await s;
    let _ = {
      setup: {
        model: g8(this.apiClient, T.model)
      }
    };
    return p.send(JSON.stringify(_)), new y6T(p, this.apiClient);
  }
}