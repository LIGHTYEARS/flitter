function M$0(T) {
  return VYT(T), T;
}
function D$0(T, R) {
  let a;
  return e;
  function e(i) {
    return T.enter("content"), a = T.enter("chunkContent", {
      contentType: "content"
    }), t(i);
  }
  function t(i) {
    if (i === null) return r(i);
    if (r9(i)) return T.check(L$0, h, r)(i);
    return T.consume(i), t;
  }
  function r(i) {
    return T.exit("chunkContent"), T.exit("content"), R(i);
  }
  function h(i) {
    return T.consume(i), T.exit("chunkContent"), a.next = T.enter("chunkContent", {
      contentType: "content",
      previous: a
    }), a = a.next, t;
  }
}