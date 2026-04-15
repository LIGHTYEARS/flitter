function M00(T, R) {
  switch (R.tag) {
    case "SpanStart":
      {
        dR(T, 0), g00(T, R.val);
        break;
      }
    case "SpanEvent":
      {
        dR(T, 1), S00(T, R.val);
        break;
      }
    case "SpanUpdate":
      {
        dR(T, 2), v00(T, R.val);
        break;
      }
    case "SpanEnd":
      {
        dR(T, 3), d00(T, R.val);
        break;
      }
    case "SpanSnapshot":
      {
        dR(T, 4), C00(T, R.val);
        break;
      }
  }
}