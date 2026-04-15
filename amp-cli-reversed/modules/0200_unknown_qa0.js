function E30(T) {
  return {
    body: O30(T)
  };
}
function C30(T, R) {
  d30(T, R.body);
}
function L30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return C30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function M30(T) {
  let R = new A0(T, W3),
    a = E30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function D30(T) {
  return {
    args: E0(T)
  };
}
function w30(T, R) {
  C0(T, R.args);
}
function B30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return w30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function N30(T) {
  let R = new A0(T, W3),
    a = D30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function U30(T) {
  return {
    output: E0(T)
  };
}
function H30(T, R) {
  C0(T, R.output);
}
function W30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return H30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function q30(T) {
  let R = new A0(T, W3),
    a = U30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function z30(T) {
  return q0(T) ? KR(T) : null;
}
function F30(T, R) {
  if (z0(T, R !== null), R !== null) YR(T, R);
}
function G30(T) {
  return q0(T) ? q0(T) : null;
}
function K30(T, R) {
  if (z0(T, R !== null), R !== null) z0(T, R);
}
function V30(T) {
  return q0(T) ? Ws(T) : null;
}
function X30(T, R) {
  if (z0(T, R !== null), R !== null) qs(T, R);
}
function Y30(T) {
  return {
    body: E0(T),
    name: z30(T),
    wait: G30(T),
    timeout: V30(T)
  };
}
function Q30(T, R) {
  C0(T, R.body), F30(T, R.name), K30(T, R.wait), X30(T, R.timeout);
}
function Z30(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return Q30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function J30(T) {
  let R = new A0(T, W3),
    a = Y30(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function Ta0(T) {
  return {
    status: KR(T),
    response: ueT(T)
  };
}
function Ra0(T, R) {
  YR(T, R.status), yeT(T, R.response);
}
function aa0(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return Ra0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function ea0(T) {
  let R = new A0(T, W3),
    a = Ta0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function ta0(T) {
  return {
    group: KR(T),
    code: KR(T),
    message: KR(T),
    metadata: ueT(T)
  };
}
function ra0(T, R) {
  YR(T, R.group), YR(T, R.code), YR(T, R.message), yeT(T, R.metadata);
}
function ha0(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return ra0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function ia0(T) {
  let R = new A0(T, W3),
    a = ta0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
function ca0(T) {
  return {
    actorId: KR(T)
  };
}
function sa0(T, R) {
  YR(T, R.actorId);
}
function oa0(T) {
  let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
  return sa0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset);
}
function na0(T) {
  let R = new A0(T, W3),
    a = ca0(R);
  if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
  return a;
}
async function qa0(T) {
  if (typeof T === "string") return T;else if (T instanceof Blob) {
    let R = await T.arrayBuffer();
    return new Uint8Array(R);
  } else if (T instanceof Uint8Array) return T;else if (T instanceof ArrayBuffer || T instanceof SharedArrayBuffer) return new Uint8Array(T);else throw new g1R();
}