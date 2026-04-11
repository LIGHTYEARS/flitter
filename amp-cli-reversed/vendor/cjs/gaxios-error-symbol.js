// Module: gaxios-error-symbol
// Original: wwT
// Type: CJS (RT wrapper)
// Exports: GAXIOS_ERROR_SYMBOL, GaxiosError, defaultErrorRedactor
// Category: util

// Module: wwT (CJS)
(T) => {
  var R =
    (T && T.__importDefault) ||
    function (c) {
      return c && c.__esModule ? c : { default: c };
    };
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.GaxiosError = T.GAXIOS_ERROR_SYMBOL = void 0),
    (T.defaultErrorRedactor = i));
  var a = R(g8T()),
    e = R($IR()),
    t = e.default.pkg;
  T.GAXIOS_ERROR_SYMBOL = Symbol.for(`${t.name}-gaxios-error`);
  class r extends Error {
    config;
    response;
    code;
    status;
    error;
    [T.GAXIOS_ERROR_SYMBOL] = t.version;
    static [Symbol.hasInstance](c) {
      if (
        c &&
        typeof c === "object" &&
        T.GAXIOS_ERROR_SYMBOL in c &&
        c[T.GAXIOS_ERROR_SYMBOL] === t.version
      )
        return !0;
      return Function.prototype[Symbol.hasInstance].call(r, c);
    }
    constructor(c, s, A, l) {
      super(c, { cause: l });
      if (
        ((this.config = s),
        (this.response = A),
        (this.error = l instanceof Error ? l : void 0),
        (this.config = (0, a.default)(!0, {}, s)),
        this.response)
      )
        this.response.config = (0, a.default)(!0, {}, this.response.config);
      if (this.response) {
        try {
          this.response.data = h(
            this.config.responseType,
            this.response?.bodyUsed ? this.response?.data : void 0,
          );
        } catch {}
        this.status = this.response.status;
      }
      if (l instanceof DOMException) this.code = l.name;
      else if (
        l &&
        typeof l === "object" &&
        "code" in l &&
        (typeof l.code === "string" || typeof l.code === "number")
      )
        this.code = l.code;
    }
    static extractAPIErrorFromResponse(c, s = "The request failed") {
      let A = s;
      if (typeof c.data === "string") A = c.data;
      if (
        c.data &&
        typeof c.data === "object" &&
        "error" in c.data &&
        c.data.error &&
        !c.ok
      ) {
        if (typeof c.data.error === "string")
          return {
            message: c.data.error,
            code: c.status,
            status: c.statusText,
          };
        if (typeof c.data.error === "object") {
          A =
            "message" in c.data.error &&
            typeof c.data.error.message === "string"
              ? c.data.error.message
              : A;
          let l =
              "status" in c.data.error &&
              typeof c.data.error.status === "string"
                ? c.data.error.status
                : c.statusText,
            o =
              "code" in c.data.error && typeof c.data.error.code === "number"
                ? c.data.error.code
                : c.status;
          if ("errors" in c.data.error && Array.isArray(c.data.error.errors)) {
            let n = [];
            for (let p of c.data.error.errors)
              if (
                typeof p === "object" &&
                "message" in p &&
                typeof p.message === "string"
              )
                n.push(p.message);
            return Object.assign(
              {
                message:
                  n.join(`
`) || A,
                code: o,
                status: l,
              },
              c.data.error,
            );
          }
          return Object.assign(
            { message: A, code: o, status: l },
            c.data.error,
          );
        }
      }
      return { message: A, code: c.status, status: c.statusText };
    }
  }
  T.GaxiosError = r;
  function h(c, s) {
    switch (c) {
      case "stream":
        return s;
      case "json":
        return JSON.parse(JSON.stringify(s));
      case "arraybuffer":
        return JSON.parse(Buffer.from(s).toString("utf8"));
      case "blob":
        return JSON.parse(s.text());
      default:
        return s;
    }
  }
  function i(c) {
    function s(o) {
      if (!o) return;
      o.forEach((n, p) => {
        if (
          /^authentication$/i.test(p) ||
          /^authorization$/i.test(p) ||
          /secret/i.test(p)
        )
          o.set(
            p,
            "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.",
          );
      });
    }
    function A(o, n) {
      if (typeof o === "object" && o !== null && typeof o[n] === "string") {
        let p = o[n];
        if (
          /grant_type=/i.test(p) ||
          /assertion=/i.test(p) ||
          /secret/i.test(p)
        )
          o[n] =
            "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
      }
    }
    function l(o) {
      if (!o || typeof o !== "object") return;
      else if (
        o instanceof FormData ||
        o instanceof URLSearchParams ||
        ("forEach" in o && "set" in o)
      )
        o.forEach((n, p) => {
          if (["grant_type", "assertion"].includes(p) || /secret/.test(p))
            o.set(
              p,
              "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.",
            );
        });
      else {
        if ("grant_type" in o)
          o.grant_type =
            "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
        if ("assertion" in o)
          o.assertion =
            "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
        if ("client_secret" in o)
          o.client_secret =
            "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.";
      }
    }
    if (c.config) {
      if (
        (s(c.config.headers),
        A(c.config, "data"),
        l(c.config.data),
        A(c.config, "body"),
        l(c.config.body),
        c.config.url.searchParams.has("token"))
      )
        c.config.url.searchParams.set(
          "token",
          "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.",
        );
      if (c.config.url.searchParams.has("client_secret"))
        c.config.url.searchParams.set(
          "client_secret",
          "<<REDACTED> - See `errorRedactor` option in `gaxios` for configuration>.",
        );
    }
    if (c.response) {
      if (
        (i({ config: c.response.config }),
        s(c.response.headers),
        c.response.bodyUsed)
      )
        (A(c.response, "data"), l(c.response.data));
    }
    return c;
  }
};
