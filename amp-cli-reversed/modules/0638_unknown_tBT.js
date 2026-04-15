function lgR(T) {
  let R = (T.get("referrer-policy") || "").split(/[,\s]+/),
    a = "";
  for (let e of R) if (e && L8T.has(e)) a = e;
  return a;
}
async function tBT(T, R) {
  return new Promise((a, e) => {
    let t = new Gj(T, R),
      {
        parsedURL: r,
        options: h
      } = bgR(t);
    if (!rBT.has(r.protocol)) throw TypeError(`node-fetch cannot load ${T}. URL scheme "${r.protocol.replace(/:$/, "")}" is not supported.`);
    if (r.protocol === "data:") {
      let p = NwT(t.url),
        _ = new ls(p, {
          headers: {
            "Content-Type": p.typeFull
          }
        });
      a(_);
      return;
    }
    let i = (r.protocol === "https:" ? PgR : ygR).request,
      {
        signal: c
      } = t,
      s = null,
      A = () => {
        let p = new M8T("The operation was aborted.");
        if (e(p), t.body && t.body instanceof DAT.Readable) t.body.destroy(p);
        if (!s || !s.body) return;
        s.body.emit("error", p);
      };
    if (c && c.aborted) {
      A();
      return;
    }
    let l = () => {
        A(), n();
      },
      o = i(r.toString(), h);
    if (c) c.addEventListener("abort", l);
    let n = () => {
      if (o.abort(), c) c.removeEventListener("abort", l);
    };
    if (o.on("error", p => {
      e(new li(`request to ${t.url} failed, reason: ${p.message}`, "system", p)), n();
    }), kgR(o, p => {
      if (s && s.body) s.body.destroy(p);
    }), process.version < "v14") o.on("socket", p => {
      let _;
      p.prependListener("end", () => {
        _ = p._eventsCount;
      }), p.prependListener("close", m => {
        if (s && _ < p._eventsCount && !m) {
          let b = Error("Premature close");
          b.code = "ERR_STREAM_PREMATURE_CLOSE", s.body.emit("error", b);
        }
      });
    });
    o.on("response", p => {
      o.setTimeout(0);
      let _ = rgR(p.rawHeaders);
      if (C8T(p.statusCode)) {
        let P = _.get("Location"),
          k = null;
        try {
          k = P === null ? null : new URL(P, t.url);
        } catch {
          if (t.redirect !== "manual") {
            e(new li(`uri requested responds with an invalid redirect URL: ${P}`, "invalid-redirect")), n();
            return;
          }
        }
        switch (t.redirect) {
          case "error":
            e(new li(`uri requested responds with a redirect, redirect mode is set to error: ${t.url}`, "no-redirect")), n();
            return;
          case "manual":
            break;
          case "follow":
            {
              if (k === null) break;
              if (t.counter >= t.follow) {
                e(new li(`maximum redirect reached at: ${t.url}`, "max-redirect")), n();
                return;
              }
              let x = {
                headers: new _n(t.headers),
                follow: t.follow,
                counter: t.counter + 1,
                agent: t.agent,
                compress: t.compress,
                method: t.method,
                body: O8T(t),
                signal: t.signal,
                size: t.size,
                referrer: t.referrer,
                referrerPolicy: t.referrerPolicy
              };
              if (!NIR(t.url, k) || !UIR(t.url, k)) for (let v of ["authorization", "www-authenticate", "cookie", "cookie2"]) x.headers.delete(v);
              if (p.statusCode !== 303 && t.body && R.body instanceof DAT.Readable) {
                e(new li("Cannot follow redirect with body being a readable stream", "unsupported-redirect")), n();
                return;
              }
              if (p.statusCode === 303 || (p.statusCode === 301 || p.statusCode === 302) && t.method === "POST") x.method = "GET", x.body = void 0, x.headers.delete("content-length");
              let f = lgR(_);
              if (f) x.referrerPolicy = f;
              a(tBT(new Gj(k, x))), n();
              return;
            }
          default:
            return e(TypeError(`Redirect option '${t.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      if (c) p.once("end", () => {
        c.removeEventListener("abort", l);
      });
      let m = Bu(p, new wAT(), P => {
        if (P) e(P);
      });
      if (process.version < "v12.10") p.on("aborted", l);
      let b = {
          url: t.url,
          status: p.statusCode,
          statusText: p.statusMessage,
          headers: _,
          size: t.size,
          counter: t.counter,
          highWaterMark: t.highWaterMark
        },
        y = _.get("Content-Encoding");
      if (!t.compress || t.method === "HEAD" || y === null || p.statusCode === 204 || p.statusCode === 304) {
        s = new ls(m, b), a(s);
        return;
      }
      let u = {
        flush: wu.Z_SYNC_FLUSH,
        finishFlush: wu.Z_SYNC_FLUSH
      };
      if (y === "gzip" || y === "x-gzip") {
        m = Bu(m, wu.createGunzip(u), P => {
          if (P) e(P);
        }), s = new ls(m, b), a(s);
        return;
      }
      if (y === "deflate" || y === "x-deflate") {
        let P = Bu(p, new wAT(), k => {
          if (k) e(k);
        });
        P.once("data", k => {
          if ((k[0] & 15) === 8) m = Bu(m, wu.createInflate(), x => {
            if (x) e(x);
          });else m = Bu(m, wu.createInflateRaw(), x => {
            if (x) e(x);
          });
          s = new ls(m, b), a(s);
        }), P.once("end", () => {
          if (!s) s = new ls(m, b), a(s);
        });
        return;
      }
      if (y === "br") {
        m = Bu(m, wu.createBrotliDecompress(), P => {
          if (P) e(P);
        }), s = new ls(m, b), a(s);
        return;
      }
      s = new ls(m, b), a(s);
    }), tgR(o, t).catch(e);
  });
}