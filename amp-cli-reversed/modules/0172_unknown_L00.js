function L00(T) {
  let R = T.offset;
  switch (s3(T)) {
    case 0:
      return {
        tag: "SpanStart",
        val: I00(T)
      };
    case 1:
      return {
        tag: "SpanEvent",
        val: j00(T)
      };
    case 2:
      return {
        tag: "SpanUpdate",
        val: $00(T)
      };
    case 3:
      return {
        tag: "SpanEnd",
        val: O00(T)
      };
    case 4:
      return {
        tag: "SpanSnapshot",
        val: E00(T)
      };
    default:
      throw T.offset = R, new I0(R, "invalid tag");
  }
}