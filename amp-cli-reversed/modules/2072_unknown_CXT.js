function CXT(T, R) {
  let a = T.trim();
  if (!a) throw Error("No code entered. Please paste the code from the browser and try again.");
  if (a.startsWith("sgamp_user_") || a.startsWith("sgamp_user_auth-bypass_")) throw Error("That looks like an API key, not the login code. Paste the code from the browser page.");
  if (!/^[A-Za-z0-9+/=]+$/.test(a) || a.length % 4 !== 0) throw Error("That code looks incomplete. Copy the full code from the browser and try again.");
  let e;
  try {
    let t = Buffer.from(a, "base64").toString("utf8");
    J.info("Decoded terminal auth code", {
      decodedLength: t.length
    }), e = JSON.parse(t);
  } catch (t) {
    throw J.error("Failed to parse decoded JSON", {
      error: t
    }), Error("Failed to parse the code. Copy the full code from the browser page and try again.");
  }
  if (!e.token || e.token.length !== R.length) throw Error("That code looks incomplete. Copy the full code from the browser and try again.");
  if (e.token !== R) throw Error("That code does not match this login attempt. Copy the latest code from the browser.");
  return {
    accessToken: e.accessToken ?? e.key
  };
}