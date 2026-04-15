async function QAT(T) {
  var R;
  if (T === void 0) throw Error("response is undefined");
  if (!T.ok) {
    let a = T.status,
      e;
    if ((R = T.headers.get("content-type")) === null || R === void 0 ? void 0 : R.includes("application/json")) e = await T.json();else e = {
      error: {
        message: await T.text(),
        code: T.status,
        status: T.statusText
      }
    };
    let t = JSON.stringify(e);
    if (a >= 400 && a < 600) throw new u7({
      message: t,
      status: a
    });
    throw Error(t);
  }
}