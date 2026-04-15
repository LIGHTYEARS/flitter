function QI0(T, R) {
  if (T.openElements.hasInScope(sT.BODY)) {
    if (T.insertionMode = YT.AFTER_BODY, T.options.sourceCodeLocationInfo) {
      let a = T.openElements.tryPeekProperlyNestedBodyElement();
      if (a) T._setEndLocation(a, R);
    }
  }
}