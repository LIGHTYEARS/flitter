async function pGT(T, R) {
  return new Promise((a, e) => {
    R = {
      ...R
    }, R.onFailedAttempt ??= () => {}, R.shouldRetry ??= () => !0, R.retries ??= 10;
    let t = Lt0.default.operation(R),
      r = () => {
        t.stop(), e(R.signal?.reason);
      };
    if (R.signal && !R.signal.aborted) R.signal.addEventListener("abort", r, {
      once: !0
    });
    let h = () => {
      R.signal?.removeEventListener("abort", r), t.stop();
    };
    t.attempt(async i => {
      try {
        let c = await T(i);
        h(), a(c);
      } catch (c) {
        try {
          if (!(c instanceof Error)) throw TypeError(`Non-error was thrown: "${c}". You should only throw errors.`);
          if (c instanceof AGT) throw c.originalError;
          if (c instanceof TypeError && !Bt0(c)) throw c;
          if (IPT(c, i, R), !(await R.shouldRetry(c))) t.stop(), e(c);
          if (await R.onFailedAttempt(c), !t.retry(c)) throw t.mainError();
        } catch (s) {
          IPT(s, i, R), h(), e(s);
        }
      }
    });
  });
}