// Module: delete-span
// Original: u$T
// Type: CJS (RT wrapper)
// Exports: deleteSpan, getActiveSpan, getSpan, getSpanContext, setSpan, setSpanContext
// Category: util

// Module: u$T (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.getSpanContext =
      T.setSpanContext =
      T.deleteSpan =
      T.setSpan =
      T.getActiveSpan =
      T.getSpan =
        void 0));
  var R = OB(),
    a = iZ(),
    e = dB(),
    t = (0, R.createContextKey)("OpenTelemetry Context Key SPAN");
  function r(l) {
    return l.getValue(t) || void 0;
  }
  T.getSpan = r;
  function h() {
    return r(e.ContextAPI.getInstance().active());
  }
  T.getActiveSpan = h;
  function i(l, o) {
    return l.setValue(t, o);
  }
  T.setSpan = i;
  function c(l) {
    return l.deleteValue(t);
  }
  T.deleteSpan = c;
  function s(l, o) {
    return i(l, new a.NonRecordingSpan(o));
  }
  T.setSpanContext = s;
  function A(l) {
    var o;
    return (o = r(l)) === null || o === void 0 ? void 0 : o.spanContext();
  }
  T.getSpanContext = A;
};
