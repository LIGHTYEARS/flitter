async function XIR(T, R) {
  if (!/multipart/i.test(R)) throw TypeError("Failed to fetch");
  let a = R.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!a) throw TypeError("no or bad content-type header, no multipart boundary");
  let e = new XwT(a[1] || a[2]),
    t,
    r,
    h,
    i,
    c,
    s,
    A = [],
    l = new xk(),
    o = b => {
      h += m.decode(b, {
        stream: !0
      });
    },
    n = b => {
      A.push(b);
    },
    p = () => {
      let b = new fO(A, s, {
        type: c
      });
      l.append(i, b);
    },
    _ = () => {
      l.append(i, h);
    },
    m = new TextDecoder("utf-8");
  m.decode(), e.onPartBegin = function () {
    e.onPartData = o, e.onPartEnd = _, t = "", r = "", h = "", i = "", c = "", s = null, A.length = 0;
  }, e.onHeaderField = function (b) {
    t += m.decode(b, {
      stream: !0
    });
  }, e.onHeaderValue = function (b) {
    r += m.decode(b, {
      stream: !0
    });
  }, e.onHeaderEnd = function () {
    if (r += m.decode(), t = t.toLowerCase(), t === "content-disposition") {
      let b = r.match(/\bname=("([^"]*)"|([^()<>@,;:\\"/[\]?={}\s\t]+))/i);
      if (b) i = b[2] || b[3] || "";
      if (s = VIR(r), s) e.onPartData = n, e.onPartEnd = p;
    } else if (t === "content-type") c = r;
    r = "", t = "";
  };
  for await (let b of T) e.write(b);
  return e.end(), l;
}