async function Hw(T = Lr, R, a = !0) {
  let e = `${T.endsWith("/") ? T.slice(0, -1) : T}/auth/cli-login?authToken=${encodeURIComponent(R)}`;
  if (a) KP = await tk0(35789), J.info("Generated callback port", {
    port: KP
  }), e = `${e}&callbackPort=${encodeURIComponent(KP)}`;
  return e;
}